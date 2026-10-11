import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

vi.mock("../../config/config.js", () => ({ default: { CLIENT_URL: "https://app.test", ADMIN_EMAILS: ["boss@x.dev"] } }));
vi.mock("../user/user.model.js", () => ({ User: { findById: vi.fn() } }));
vi.mock("./plan-request.model.js", () => ({ PlanRequest: { findOneAndUpdate: vi.fn(), find: vi.fn(), updateOne: vi.fn(), countDocuments: vi.fn() } }));
vi.mock("../admin/admin-audit.model.js", () => ({ AdminAudit: { create: vi.fn() } }));
vi.mock("../admin/admin.service.js", () => ({ setUserPlan: vi.fn(async (_id: string, i: any) => ({ plan: i.plan, expiresAt: i.expiresAt })) }));
vi.mock("../../utils/mail.js", () => ({ sendEmail: vi.fn(async () => ({ success: true })) }));

import { User } from "../user/user.model.js";
import { PlanRequest } from "./plan-request.model.js";
import { AdminAudit } from "../admin/admin-audit.model.js";
import { setUserPlan } from "../admin/admin.service.js";
import { sendEmail } from "../../utils/mail.js";
import { approveRequest, approveSchema, cancelRequest, createRequest, createRequestSchema, rejectRequest } from "./plan-request.service.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const uid = new mongoose.Types.ObjectId().toString();
const rid = new mongoose.Types.ObjectId().toString();
const admin = { _id: new mongoose.Types.ObjectId(), email: "boss@x.dev" };
const lean = (v: unknown) => ({ lean: async () => v });
const popLean = (v: unknown) => ({ populate: () => lean(v) });
const asUser = (plan?: object) => m(User.findById).mockReturnValue({ select: () => lean({ name: "Asha", email: "a@x.dev", plan }) });
const flush = () => new Promise((r) => setTimeout(r, 0));
const pending = (o: object = {}) => ({ _id: rid, plan: "plus", period: "monthly", status: "approved", userId: { _id: uid, name: "Asha", email: "a@x.dev" }, createdAt: new Date(), ...o });

beforeEach(() => {
  vi.clearAllMocks();
  asUser(undefined);
});

describe("createRequest", () => {
  it("opens (or updates) the user's single pending request and emails the admins", async () => {
    m(PlanRequest.findOneAndUpdate).mockReturnValue(lean({ _id: rid, plan: "pro", period: "yearly", status: "pending", createdAt: new Date() }));
    const r = await createRequest(uid, createRequestSchema.parse({ plan: "pro", period: "yearly", note: "  for school  " }));
    expect(r).toMatchObject({ plan: "pro", period: "yearly", status: "pending" });
    const [filter, update, opts] = m(PlanRequest.findOneAndUpdate).mock.calls[0]!;
    expect(filter).toEqual({ userId: uid, status: "pending" });
    expect(update.$set).toEqual({ plan: "pro", period: "yearly", note: "for school" });
    expect(opts).toMatchObject({ upsert: true });
    await flush();
    expect(m(sendEmail).mock.calls[0]![0]).toMatchObject({ to: ["boss@x.dev"], subject: expect.stringMatching(/Asha → Pro \(yearly\)/) });
  });

  it("refuses a plan the user already has or is above", async () => {
    asUser({ id: "pro" });
    await expect(createRequest(uid, { plan: "plus", period: "monthly" })).rejects.toMatchObject({ statusCode: 400, message: "You're already on Pro." });
    asUser({ id: "plus" });
    await expect(createRequest(uid, { plan: "plus", period: "monthly" })).rejects.toMatchObject({ statusCode: 400 });
    expect(PlanRequest.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("only accepts paid plans", () => {
    expect(createRequestSchema.safeParse({ plan: "free", period: "monthly" }).success).toBe(false);
  });
});

describe("cancelRequest", () => {
  it("cancels only the user's own pending request", async () => {
    m(PlanRequest.findOneAndUpdate).mockReturnValue(lean(null));
    await expect(cancelRequest(uid, rid)).rejects.toMatchObject({ statusCode: 404 });
    expect(m(PlanRequest.findOneAndUpdate).mock.calls[0]![0]).toEqual({ _id: rid, userId: uid, status: "pending" });
  });
});

describe("approveRequest", () => {
  it("assigns the plan with a default end date from the billing period and emails the user", async () => {
    m(PlanRequest.findOneAndUpdate).mockReturnValue(popLean(pending({ period: "yearly" })));
    const before = Date.now();
    await approveRequest(rid, approveSchema.parse({}), admin);
    const [userId, input] = m(setUserPlan).mock.calls[0]!;
    expect(userId).toBe(uid);
    expect(input.plan).toBe("plus");
    const days = (input.expiresAt.getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(364);
    expect(days).toBeLessThan(367);
    await flush();
    expect(m(sendEmail).mock.calls[0]![0]).toMatchObject({ to: "a@x.dev", subject: "You're on Kollects Plus" });
  });

  it("honours an explicit 'no end date'", async () => {
    m(PlanRequest.findOneAndUpdate).mockReturnValue(popLean(pending()));
    await approveRequest(rid, approveSchema.parse({ expiresAt: null }), admin);
    expect(m(setUserPlan).mock.calls[0]![1].expiresAt).toBeNull();
  });

  it("409s when the request was already decided (double click / second admin tab)", async () => {
    m(PlanRequest.findOneAndUpdate).mockReturnValue(popLean(null));
    await expect(approveRequest(rid, {}, admin)).rejects.toMatchObject({ statusCode: 409 });
    expect(setUserPlan).not.toHaveBeenCalled();
  });

  it("rejects a past end date before touching the request", async () => {
    await expect(approveRequest(rid, { expiresAt: new Date("2020-01-01") }, admin)).rejects.toMatchObject({ statusCode: 400 });
    expect(PlanRequest.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("puts the request back to pending if assigning the plan fails", async () => {
    m(PlanRequest.findOneAndUpdate).mockReturnValue(popLean(pending()));
    m(setUserPlan).mockRejectedValueOnce(new Error("db down"));
    await expect(approveRequest(rid, {}, admin)).rejects.toThrow("db down");
    expect(m(PlanRequest.updateOne).mock.calls[0]![1].$set).toEqual({ status: "pending" });
  });
});

describe("rejectRequest", () => {
  it("records the reason, audits it and tells the user (HTML-escaped)", async () => {
    m(PlanRequest.findOneAndUpdate).mockReturnValue(popLean(pending({ status: "rejected" })));
    await rejectRequest(rid, { reason: "Pay first <b>please</b>" }, admin);
    expect(m(PlanRequest.findOneAndUpdate).mock.calls[0]![1].$set).toMatchObject({ status: "rejected", adminNote: "Pay first <b>please</b>" });
    expect(m(AdminAudit.create).mock.calls[0]![0]).toMatchObject({ action: "plan_request.reject", result: { reason: "Pay first <b>please</b>" } });
    await flush();
    expect(m(sendEmail).mock.calls[0]![0].html).toContain("Pay first &lt;b&gt;please&lt;/b&gt;");
  });
});
