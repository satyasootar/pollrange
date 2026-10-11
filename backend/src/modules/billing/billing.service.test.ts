import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

vi.mock("../../config/config.js", () => ({ default: { CLIENT_URL: "https://app.test" } }));
vi.mock("../user/user.model.js", () => ({ User: { findById: vi.fn() } }));
vi.mock("../poll/poll.model.js", () => ({ Poll: { countDocuments: vi.fn() } }));
vi.mock("../form/form.model.js", () => ({ Form: { countDocuments: vi.fn() } }));
vi.mock("./usage.model.js", () => ({
  Usage: { findOneAndUpdate: vi.fn(), updateOne: vi.fn(), findOne: vi.fn() },
  currentPeriod: () => "2026-10",
}));
vi.mock("../../utils/mail.js", () => ({ sendEmail: vi.fn(async () => ({ success: true })) }));

import { User } from "../user/user.model.js";
import { Poll } from "../poll/poll.model.js";
import { Form } from "../form/form.model.js";
import { Usage } from "./usage.model.js";
import { sendEmail } from "../../utils/mail.js";
import { assertFeature, assertLiveCapacity, consume, getPlanState, refund } from "./billing.service.js";
import { effectivePlan, publicCatalog } from "../../config/plans.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const uid = new mongoose.Types.ObjectId().toString();
const asUser = (plan?: object) => m(User.findById).mockReturnValue({ select: () => ({ lean: async () => ({ name: "Asha", email: "a@x.dev", plan }) }) });
const usageDoc = (n: number) => ({ lean: async () => ({ _id: "u1", responses: n, uploads: n, aiMessages: n }) });
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  asUser(undefined);
  m(Usage.updateOne).mockResolvedValue({ modifiedCount: 1 });
});

describe("effectivePlan", () => {
  it("defaults to free and falls back to free once a plan expires", () => {
    expect(effectivePlan(undefined)).toBe("free");
    expect(effectivePlan({ plan: { id: "bogus" } })).toBe("free");
    expect(effectivePlan({ plan: { id: "pro" } })).toBe("pro");
    const now = new Date("2026-10-11");
    expect(effectivePlan({ plan: { id: "plus", expiresAt: new Date("2026-12-01") } }, now)).toBe("plus");
    expect(effectivePlan({ plan: { id: "plus", expiresAt: new Date("2026-10-01") } }, now)).toBe("free");
  });

  it("serialises unlimited as null for the public catalog", () => {
    const pro = publicCatalog().find((p) => p.id === "pro")!;
    expect(pro.limits.liveItems).toBeNull();
    expect(pro.priceMonthly).toBe(799);
  });
});

describe("consume", () => {
  it("increments only while under limit × 1.2 (Free: 1,000 responses → cap 1,200)", async () => {
    m(Usage.findOneAndUpdate).mockReturnValue(usageDoc(10));
    await consume(uid, "responses");
    const [filter, update, opts] = m(Usage.findOneAndUpdate).mock.calls[0]!;
    expect(filter.$or[0]).toEqual({ responses: { $lt: 1200 } });
    expect(update).toEqual({ $inc: { responses: 1 } });
    expect(opts).toMatchObject({ upsert: true });
    await flush();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("uses the paid plan's limit (Plus: 10,000 → cap 12,000)", async () => {
    asUser({ id: "plus" });
    m(Usage.findOneAndUpdate).mockReturnValue(usageDoc(1));
    await consume(uid, "responses");
    expect(m(Usage.findOneAndUpdate).mock.calls[0]![0].$or[0]).toEqual({ responses: { $lt: 12000 } });
  });

  it("over the cap: respondents get a neutral 402, creators get plan details", async () => {
    // At the cap the conditional upsert collides with the unique index.
    m(Usage.findOneAndUpdate).mockReturnValue({ lean: async () => { throw Object.assign(new Error("dup"), { code: 11000 }); } });
    const respondent = await consume(uid, "responses", "respondent").catch((e) => e);
    expect(respondent.statusCode).toBe(402);
    expect(respondent.message).toBe("This form isn't accepting responses right now. Please try again later.");
    expect(respondent.errors[0]).toEqual({ code: "PLAN_LIMIT", metric: "responses" });

    const creator = await consume(uid, "aiMessages").catch((e) => e);
    expect(creator.message).toMatch(/AI messages on the Free plan \(30\).*Upgrade to Plus/);
    expect(creator.errors[0]).toMatchObject({ code: "PLAN_LIMIT", limit: 30, plan: "free", upgradeTo: "plus" });
  });

  it("emails once at 80% and once at 100%", async () => {
    m(Usage.findOneAndUpdate).mockReturnValue(usageDoc(800));
    await consume(uid, "responses");
    await flush();
    expect(m(Usage.updateOne).mock.calls[0]![0]).toMatchObject({ "notified.responses_warn": { $ne: true } });
    expect(m(sendEmail).mock.calls[0]![0]).toMatchObject({ to: "a@x.dev", subject: expect.stringMatching(/80%/) });

    // Flag already set → no second email for the same threshold.
    m(Usage.updateOne).mockResolvedValue({ modifiedCount: 0 });
    m(Usage.findOneAndUpdate).mockReturnValue(usageDoc(801));
    await consume(uid, "responses");
    await flush();
    expect(sendEmail).toHaveBeenCalledTimes(1);

    m(Usage.updateOne).mockResolvedValue({ modifiedCount: 1 });
    m(Usage.findOneAndUpdate).mockReturnValue(usageDoc(1000));
    await consume(uid, "responses");
    await flush();
    expect(m(Usage.updateOne).mock.calls.at(-1)![0]).toMatchObject({ "notified.responses_limit": { $ne: true } });
    expect(m(sendEmail).mock.calls[1]![0].subject).toMatch(/reached your monthly responses limit/);
  });

  it("a failing email never fails the submit", async () => {
    m(sendEmail).mockRejectedValueOnce(new Error("resend down"));
    m(Usage.findOneAndUpdate).mockReturnValue(usageDoc(1000));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(consume(uid, "responses")).resolves.toBeUndefined();
    await flush();
    spy.mockRestore();
  });

  it("refund only decrements a positive counter", async () => {
    await refund(uid, "uploads");
    expect(m(Usage.updateOne).mock.calls[0]![0]).toMatchObject({ period: "2026-10", uploads: { $gt: 0 } });
    expect(m(Usage.updateOne).mock.calls[0]![1]).toEqual({ $inc: { uploads: -1 } });
  });
});

describe("assertLiveCapacity", () => {
  it("blocks the 11th live item on Free but not on Pro", async () => {
    m(Poll.countDocuments).mockResolvedValue(4);
    m(Form.countDocuments).mockResolvedValue(6);
    await expect(assertLiveCapacity(uid)).rejects.toMatchObject({ statusCode: 402, message: expect.stringMatching(/10 live.*allows 10/) });
    expect(m(Poll.countDocuments).mock.calls[0]![0]).toMatchObject({ status: "active", isDeleted: false });

    m(Form.countDocuments).mockResolvedValue(5);
    await expect(assertLiveCapacity(uid)).resolves.toBeUndefined();

    asUser({ id: "pro" });
    m(Form.countDocuments).mockResolvedValue(500);
    await expect(assertLiveCapacity(uid)).resolves.toBeUndefined();
  });
});

describe("assertFeature", () => {
  it("locks custom slugs and branding on Free, unlocks on Plus, relocks when Plus expires", async () => {
    await expect(assertFeature(uid, "customSlug")).rejects.toMatchObject({ statusCode: 402 });
    asUser({ id: "plus" });
    await expect(assertFeature(uid, "branding")).resolves.toBeUndefined();
    asUser({ id: "plus", expiresAt: new Date(Date.now() - 1000) });
    await expect(assertFeature(uid, "branding")).rejects.toMatchObject({ statusCode: 402 });
  });
});

describe("getPlanState", () => {
  it("reports usage against limits, unlimited as null", async () => {
    asUser({ id: "pro" });
    m(Usage.findOne).mockReturnValue({ lean: async () => ({ responses: 42 }) });
    m(Poll.countDocuments).mockResolvedValue(1);
    m(Form.countDocuments).mockResolvedValue(2);
    const s = await getPlanState(uid);
    expect(s.plan).toBe("pro");
    expect(s.usage.responses).toEqual({ used: 42, limit: 100000 });
    expect(s.usage.uploads).toEqual({ used: 0, limit: 20000 });
    expect(s.usage.liveItems).toEqual({ used: 3, limit: null });
    expect(s.features).toEqual({ customSlug: true, branding: true });
  });
});
