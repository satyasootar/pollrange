import mongoose from "mongoose";
import { User } from "../user/user.model.js";
import { Poll } from "../poll/poll.model.js";
import { Form } from "../form/form.model.js";
import { Usage, currentPeriod } from "./usage.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendEmail } from "../../utils/mail.js";
import config from "../../config/config.js";
import { GRACE, PLANS, WARN_AT, effectivePlan, type Feature, type Metric, type PlanId } from "../../config/plans.js";

const METRIC_LABEL: Record<Metric, string> = { responses: "responses", uploads: "file uploads", aiMessages: "AI messages" };
const FEATURE_LABEL: Record<Feature, string> = { customSlug: "Custom form links", branding: "Custom branding" };

const fmt = (n: number) => n.toLocaleString("en-IN");

/** Cheapest plan that unlocks a feature / has more room — used in upgrade hints. */
function upgradeFor(planId: PlanId): PlanId | null {
  return planId === "free" ? "plus" : planId === "plus" ? "pro" : null;
}

function planError(message: string, detail: Record<string, unknown>) {
  return new ApiError(402, message, [{ code: "PLAN_LIMIT", ...detail }]);
}

async function loadUser(userId: string | mongoose.Types.ObjectId) {
  return User.findById(userId).select("name email plan").lean();
}

// ─── Read ───────────────────────────────────────────────────────────────────────

export async function countLive(userId: string | mongoose.Types.ObjectId) {
  const q = { creatorId: userId, status: "active" as const, isDeleted: false };
  const [polls, forms] = await Promise.all([Poll.countDocuments(q), Form.countDocuments(q)]);
  return polls + forms;
}

export async function getPlanState(userId: string) {
  const user: any = await loadUser(userId);
  const planId = effectivePlan(user);
  const plan = PLANS[planId];
  const [usage, liveItems] = await Promise.all([
    Usage.findOne({ userId, period: currentPeriod() }).lean() as Promise<any>,
    countLive(userId),
  ]);
  const cap = (n: number) => (Number.isFinite(n) ? n : null);
  return {
    plan: planId,
    label: plan.label,
    assignedPlan: user?.plan?.id ?? "free",
    expiresAt: user?.plan?.expiresAt ?? null,
    period: currentPeriod(),
    features: plan.features,
    grace: GRACE,
    usage: {
      responses: { used: usage?.responses ?? 0, limit: cap(plan.limits.responses) },
      uploads: { used: usage?.uploads ?? 0, limit: cap(plan.limits.uploads) },
      aiMessages: { used: usage?.aiMessages ?? 0, limit: cap(plan.limits.aiMessages) },
      liveItems: { used: liveItems, limit: cap(plan.limits.liveItems) },
    },
  };
}

// ─── Gates ──────────────────────────────────────────────────────────────────────

/**
 * Atomically counts one unit of `metric` against the creator's monthly quota.
 * Allows up to limit × GRACE, then throws 402. Respondent-facing callers get a
 * neutral message that never mentions plans.
 */
export async function consume(
  creatorId: string | mongoose.Types.ObjectId,
  metric: Metric,
  audience: "creator" | "respondent" = "creator"
) {
  const user: any = await loadUser(creatorId);
  const planId = effectivePlan(user);
  const limit = PLANS[planId].limits[metric];
  const period = currentPeriod();
  const userId = new mongoose.Types.ObjectId(String(creatorId));

  if (!Number.isFinite(limit)) {
    await Usage.updateOne({ userId, period }, { $inc: { [metric]: 1 } }, { upsert: true });
    return;
  }

  const cap = Math.floor(limit * GRACE);
  let doc: any;
  try {
    // Matches only while under the cap; at the cap the upsert collides with the
    // unique (userId, period) index — that collision *is* "over limit".
    doc = await Usage.findOneAndUpdate(
      { userId, period, $or: [{ [metric]: { $lt: cap } }, { [metric]: { $exists: false } }] },
      { $inc: { [metric]: 1 } },
      { upsert: true, returnDocument: "after" }
    ).lean();
  } catch (err: any) {
    if (err?.code !== 11000) throw err;
    doc = null;
  }

  if (!doc) {
    const next = upgradeFor(planId);
    throw planError(
      audience === "respondent"
        ? "This form isn't accepting responses right now. Please try again later."
        : `You've used this month's ${METRIC_LABEL[metric]} on the ${PLANS[planId].label} plan (${fmt(limit)}).${next ? ` Upgrade to ${PLANS[next].label} for more.` : ""}`,
      audience === "respondent" ? { metric } : { metric, limit, plan: planId, upgradeTo: next }
    );
  }

  // Fire-and-forget: a slow email must never delay a respondent's submit.
  void notifyThresholds(user, metric, doc[metric], limit, doc._id).catch((e) => console.error("[billing] notify failed", e));
}

/** Gives back a unit consumed for an action that then failed. */
export async function refund(creatorId: string | mongoose.Types.ObjectId, metric: Metric) {
  await Usage.updateOne(
    { userId: new mongoose.Types.ObjectId(String(creatorId)), period: currentPeriod(), [metric]: { $gt: 0 } },
    { $inc: { [metric]: -1 } }
  );
}

async function notifyThresholds(user: any, metric: Metric, used: number, limit: number, usageId: unknown) {
  if (!user?.email) return;
  const steps = [
    { key: `${metric}_limit`, at: limit, subject: `You've reached your monthly ${METRIC_LABEL[metric]} limit` },
    { key: `${metric}_warn`, at: Math.ceil(limit * WARN_AT), subject: `You've used 80% of your monthly ${METRIC_LABEL[metric]}` },
  ];
  // Highest threshold crossed wins; the flag flip is atomic so only one request emails.
  const step = steps.find((s) => used >= s.at);
  if (!step) return;
  const flipped = await Usage.updateOne({ _id: usageId, [`notified.${step.key}`]: { $ne: true } }, { $set: { [`notified.${step.key}`]: true } });
  if (flipped.modifiedCount !== 1) return;

  const extra = Math.floor(limit * GRACE) - limit;
  const body =
    step.key.endsWith("_limit")
      ? `<p>You've used all ${fmt(limit)} ${METRIC_LABEL[metric]} on your plan this month. Kollects will keep accepting up to ${fmt(extra)} more so nobody gets turned away, then pause until next month.</p>`
      : `<p>You've used ${fmt(used)} of ${fmt(limit)} ${METRIC_LABEL[metric]} this month.</p>`;
  await sendEmail({
    to: user.email,
    subject: step.subject,
    html: `<p>Hi ${user.name ?? "there"},</p>${body}<p><a href="${config.CLIENT_URL}/dashboard/billing">See your plan and usage</a></p>`,
    idempotencyKey: `usage-${String(usageId)}-${step.key}`,
  });
}

/** Blocks a new item going live once the plan's "live at once" cap is reached. Drafts never count. */
export async function assertLiveCapacity(userId: string | mongoose.Types.ObjectId) {
  const user: any = await loadUser(userId);
  const planId = effectivePlan(user);
  const limit = PLANS[planId].limits.liveItems;
  if (!Number.isFinite(limit)) return;
  const live = await countLive(userId);
  if (live >= limit) {
    const next = upgradeFor(planId);
    throw planError(
      `You have ${fmt(live)} live forms and polls; the ${PLANS[planId].label} plan allows ${fmt(limit)} at once. Close one${next ? ` or upgrade to ${PLANS[next].label}` : ""}.`,
      { metric: "liveItems", limit, plan: planId, upgradeTo: next }
    );
  }
}

export async function hasFeature(userId: string | mongoose.Types.ObjectId, feature: Feature) {
  return PLANS[effectivePlan(await loadUser(userId) as any)].features[feature];
}

export async function assertFeature(userId: string | mongoose.Types.ObjectId, feature: Feature) {
  if (await hasFeature(userId, feature)) return;
  throw planError(`${FEATURE_LABEL[feature]} are available on Plus and Pro.`, { feature, upgradeTo: "plus" });
}
