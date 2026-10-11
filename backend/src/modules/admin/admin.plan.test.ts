import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

vi.mock("../../config/config.js", () => ({ default: { ENVIRONMENT: "test", ADMIN_EMAILS: [] } }));
vi.mock("../user/user.model.js", () => ({ User: { findById: vi.fn(), updateOne: vi.fn() } }));
vi.mock("./admin-audit.model.js", () => ({ AdminAudit: { create: vi.fn() } }));

import { User } from "../user/user.model.js";
import { AdminAudit } from "./admin-audit.model.js";
import { planFilter, setPlanSchema, setUserPlan } from "./admin.service.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const admin = { _id: new mongoose.Types.ObjectId(), email: "satya.sootar06@gmail.com" };
const userId = new mongoose.Types.ObjectId().toString();

beforeEach(() => {
  vi.clearAllMocks();
  m(User.findById).mockReturnValue({ select: () => ({ lean: async () => ({ email: "a@x.dev", plan: { id: "free" } }) }) });
});

describe("setPlanSchema", () => {
  it("accepts a plan with optional future expiry, rejects past expiry and unknown plans", () => {
    expect(setPlanSchema.safeParse({ plan: "pro" }).success).toBe(true);
    expect(setPlanSchema.safeParse({ plan: "plus", expiresAt: new Date(Date.now() + 86_400_000).toISOString() }).success).toBe(true);
    expect(setPlanSchema.safeParse({ plan: "plus", expiresAt: "2020-01-01" }).success).toBe(false);
    expect(setPlanSchema.safeParse({ plan: "enterprise" }).success).toBe(false);
  });
});

describe("setUserPlan", () => {
  it("writes the entitlement and an audit row with the previous plan", async () => {
    const expiresAt = new Date(Date.now() + 30 * 86_400_000);
    const r = await setUserPlan(userId, { plan: "plus", expiresAt }, admin);
    expect(r).toEqual({ plan: "plus", expiresAt });
    expect(m(User.updateOne).mock.calls[0]![1].$set.plan).toMatchObject({ id: "plus", expiresAt, assignedBy: admin._id });
    expect(m(AdminAudit.create).mock.calls[0]![0]).toMatchObject({
      action: "user.plan",
      params: { userId, email: "a@x.dev", plan: "plus" },
      result: { before: { plan: "free" } },
    });
  });

  it("drops any expiry when moving someone to Free", async () => {
    await setUserPlan(userId, { plan: "free", expiresAt: new Date(Date.now() + 1e9) }, admin);
    expect(m(User.updateOne).mock.calls[0]![1].$set.plan).not.toHaveProperty("expiresAt");
  });

  it("404s for an invalid or unknown user", async () => {
    await expect(setUserPlan("nope", { plan: "pro" }, admin)).rejects.toMatchObject({ statusCode: 404 });
    m(User.findById).mockReturnValue({ select: () => ({ lean: async () => null }) });
    await expect(setUserPlan(userId, { plan: "pro" }, admin)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("planFilter", () => {
  it("counts expired paid plans as free", () => {
    const now = new Date("2026-10-11");
    expect(planFilter("plus", now)).toEqual({ "plan.id": "plus", $or: [{ "plan.expiresAt": null }, { "plan.expiresAt": { $gt: now } }] });
    expect(planFilter("free", now)).toEqual({ $nor: [{ "plan.id": { $in: ["plus", "pro"] }, $or: [{ "plan.expiresAt": null }, { "plan.expiresAt": { $gt: now } }] }] });
  });
});
