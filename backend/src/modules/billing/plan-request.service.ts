import { z } from "zod";
import mongoose from "mongoose";
import { PlanRequest } from "./plan-request.model.js";
import { User } from "../user/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendEmail } from "../../utils/mail.js";
import { renderEmail, type EmailLayout } from "../../utils/email-layout.js";
import config from "../../config/config.js";
import { PLANS, effectivePlan, type PlanId } from "../../config/plans.js";
import { AdminAudit } from "../admin/admin-audit.model.js";
import { setUserPlan } from "../admin/admin.service.js";

const RANK: Record<PlanId, number> = { free: 0, plus: 1, pro: 2 };

export const createRequestSchema = z.object({
  plan: z.enum(["plus", "pro"]),
  period: z.enum(["monthly", "yearly"]),
  note: z.string().trim().max(500).optional(),
});

export const approveSchema = z.object({
  // Omitted → default from the requested period; null → no end date.
  expiresAt: z.coerce.date().nullable().optional(),
});

export const rejectSchema = z.object({ reason: z.string().trim().max(500).optional() });

const toDto = (r: any) => ({
  id: String(r._id),
  plan: r.plan as PlanId,
  period: r.period as "monthly" | "yearly",
  note: r.note ?? null,
  status: r.status as "pending" | "approved" | "rejected" | "cancelled",
  adminNote: r.adminNote ?? null,
  createdAt: r.createdAt,
  decidedAt: r.decidedAt ?? null,
});

/** Fire-and-forget email; a mail outage must never fail the request itself. */
function notify(to: string | string[], subject: string, email: Omit<EmailLayout, "preheader">) {
  if (!to || (Array.isArray(to) && !to.length)) return;
  void sendEmail({ to, subject, html: renderEmail({ preheader: subject, ...email }) }).catch((e) =>
    console.error("[plan-request] email failed", e)
  );
}

// ─── User side ──────────────────────────────────────────────────────────────────

export async function createRequest(userId: string, input: z.infer<typeof createRequestSchema>) {
  const user: any = await User.findById(userId).select("name email plan").lean();
  if (!user) throw new ApiError(404, "User not found");
  const current = effectivePlan(user);
  if (RANK[input.plan] <= RANK[current]) {
    throw new ApiError(400, `You're already on ${PLANS[current].label}.`);
  }

  // Re-requesting while one is open updates it (the partial unique index keeps it to one).
  const doc = await PlanRequest.findOneAndUpdate(
    { userId, status: "pending" },
    { $set: { plan: input.plan, period: input.period, note: input.note ?? "" } },
    { upsert: true, returnDocument: "after" }
  ).lean();

  notify(
    config.ADMIN_EMAILS,
    `Upgrade request: ${user.name} → ${PLANS[input.plan].label} (${input.period})`,
    {
      heading: "New upgrade request",
      bodyHtml:
        `<p style="margin:0 0 12px"><b>${escapeHtml(user.name ?? "")}</b> (${escapeHtml(user.email ?? "")}) asked for <b>${PLANS[input.plan].label}</b>, billed ${input.period}.</p>` +
        (input.note ? `<p style="margin:0 0 12px">Note: ${escapeHtml(input.note)}</p>` : ""),
      cta: { label: "Review in admin", url: `${config.CLIENT_URL}/admin?tab=upgrades` },
    }
  );
  return toDto(doc);
}

export async function myRequests(userId: string) {
  const rows = await PlanRequest.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();
  return rows.map(toDto);
}

export async function cancelRequest(userId: string, requestId: string) {
  if (!mongoose.isValidObjectId(requestId)) throw new ApiError(404, "Request not found");
  const r = await PlanRequest.findOneAndUpdate({ _id: requestId, userId, status: "pending" }, { $set: { status: "cancelled" } }, { returnDocument: "after" }).lean();
  if (!r) throw new ApiError(404, "No pending request to cancel");
  return toDto(r);
}

// ─── Admin side ─────────────────────────────────────────────────────────────────

export async function listRequests(status?: string) {
  const STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
  const match = STATUSES.find((s) => s === status);
  const filter = match ? { status: match } : {};
  const rows = await PlanRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("userId", "name email plan")
    .lean();
  const items = rows.map((r: any) => ({
    ...toDto(r),
    user: r.userId
      ? { id: String(r.userId._id), name: r.userId.name, email: r.userId.email, plan: effectivePlan(r.userId) }
      : null,
  }));
  items.sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending") || +new Date(b.createdAt) - +new Date(a.createdAt));
  return items;
}

export const countPending = () => PlanRequest.countDocuments({ status: "pending" });

function defaultExpiry(period: "monthly" | "yearly", from = new Date()) {
  const d = new Date(from);
  if (period === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

type Admin = { _id: mongoose.Types.ObjectId; email: string };

/** Claims the pending request atomically so a double-click can't decide it twice. */
async function claim(requestId: string, status: "approved" | "rejected", admin: Admin, adminNote?: string) {
  if (!mongoose.isValidObjectId(requestId)) throw new ApiError(404, "Request not found");
  const r: any = await PlanRequest.findOneAndUpdate(
    { _id: requestId, status: "pending" },
    { $set: { status, decidedBy: admin._id, decidedAt: new Date(), ...(adminNote ? { adminNote } : {}) } },
    { returnDocument: "after" }
  )
    .populate("userId", "name email")
    .lean();
  if (!r) throw new ApiError(409, "This request was already handled or cancelled.");
  return r;
}

export async function approveRequest(requestId: string, input: z.infer<typeof approveSchema>, admin: Admin) {
  if (input.expiresAt && input.expiresAt <= new Date()) throw new ApiError(400, "End date must be in the future");
  const r = await claim(requestId, "approved", admin);
  const expiresAt = input.expiresAt === undefined ? defaultExpiry(r.period) : input.expiresAt;
  let result;
  try {
    // setUserPlan writes the user.plan audit row.
    result = await setUserPlan(String(r.userId._id), { plan: r.plan, expiresAt }, admin);
  } catch (err) {
    // Don't leave a request "approved" when the plan never changed.
    await PlanRequest.updateOne({ _id: r._id }, { $set: { status: "pending" }, $unset: { decidedBy: 1, decidedAt: 1 } });
    throw err;
  }

  notify(
    r.userId.email,
    `You're on Kollects ${PLANS[r.plan as PlanId].label}`,
    {
      heading: `Welcome to ${PLANS[r.plan as PlanId].label}`,
      bodyHtml:
        `<p style="margin:0 0 12px">Hi ${escapeHtml(r.userId.name ?? "there")},</p><p style="margin:0 0 12px">Your upgrade to <b>${PLANS[r.plan as PlanId].label}</b> is active` +
        (expiresAt ? ` until ${expiresAt.toDateString()}` : "") +
        ".</p>",
      cta: { label: "See your plan", url: `${config.CLIENT_URL}/dashboard/billing` },
    }
  );
  return { ...toDto(r), ...result };
}

export async function rejectRequest(requestId: string, input: z.infer<typeof rejectSchema>, admin: Admin) {
  const r = await claim(requestId, "rejected", admin, input.reason);
  await AdminAudit.create({
    adminId: admin._id,
    adminEmail: admin.email,
    action: "plan_request.reject",
    params: { requestId, userId: String(r.userId._id), email: r.userId.email, plan: r.plan },
    result: { reason: input.reason ?? null },
  });
  notify(
    r.userId.email,
    "About your Kollects upgrade request",
    {
      heading: "About your upgrade request",
      bodyHtml:
        `<p style="margin:0 0 12px">Hi ${escapeHtml(r.userId.name ?? "there")},</p><p style="margin:0 0 12px">We couldn't approve your request for ${PLANS[r.plan as PlanId].label} right now.</p>` +
        (input.reason ? `<p style="margin:0 0 12px">${escapeHtml(input.reason)}</p>` : "") +
        `<p style="margin:0">You're still on your current plan, and you can request again anytime.</p>`,
      cta: { label: "See plans", url: `${config.CLIENT_URL}/dashboard/billing` },
    }
  );
  return toDto(r);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
