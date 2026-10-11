import os from "node:os";
import mongoose from "mongoose";
import { User } from "../user/user.model.js";
import { Poll } from "../poll/poll.model.js";
import { Form } from "../form/form.model.js";
import { ResponseModel } from "../response/response.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { Session } from "../session/session.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { aggregateTimelineWhere, bucketKeys, type Granularity } from "../../utils/timeline.js";
import { getEventLoopDelayMs, getMetricsSnapshot } from "../../utils/metrics.js";
import { getSocketStats } from "../../socket/index.js";
import { expiryJobStatus } from "../../jobs/expiry.job.js";
import cloudinary, { isCloudinaryConfigured } from "../../config/cloudinary.js";
import config from "../../config/config.js";
import { effectivePlan, PLAN_IDS, type PlanId } from "../../config/plans.js";
import { AdminAudit } from "./admin-audit.model.js";
import { PlanRequest } from "../billing/plan-request.model.js";
import { z } from "zod";

const DAY = 86_400_000;
const ACTIVE = ["active", "published"] as ("active" | "published")[];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── Overview ───────────────────────────────────────────────────────────────────

export async function getOverview(groupBy: Granularity) {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY);
  const since30 = new Date(now - 30 * DAY);
  const live = { isDeleted: false };

  const [
    users, verified, googleUsers, newUsers7, newUsers30, activeSessions,
    polls, forms, activePolls, activeForms,
    pollResponses, formResponses, pollResponses7, formResponses7,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isEmailVerified: true }),
    User.countDocuments({ googleId: { $exists: true } }),
    User.countDocuments({ createdAt: { $gte: since7 } }),
    User.countDocuments({ createdAt: { $gte: since30 } }),
    Session.countDocuments({ isActive: true, expiresAt: { $gt: new Date() } }),
    Poll.countDocuments(live),
    Form.countDocuments(live),
    Poll.countDocuments({ ...live, status: { $in: ACTIVE } }),
    Form.countDocuments({ ...live, status: { $in: ACTIVE } }),
    ResponseModel.estimatedDocumentCount(),
    FormResponse.estimatedDocumentCount(),
    ResponseModel.countDocuments({ submittedAt: { $gte: since7 } }),
    FormResponse.countDocuments({ submittedAt: { $gte: since7 } }),
  ]);

  const [signupTl, pollTl, formTl] = await Promise.all([
    aggregateTimelineWhere(User, {}, groupBy, "createdAt"),
    aggregateTimelineWhere(ResponseModel, {}, groupBy),
    aggregateTimelineWhere(FormResponse, {}, groupBy),
  ]);
  const toMap = (rows: { date: string; count: number }[]) => new Map(rows.map((r) => [r.date, r.count]));
  const [s, p, f] = [toMap(signupTl), toMap(pollTl), toMap(formTl)];
  const full = bucketKeys(groupBy).map((date) => ({ date, signups: s.get(date) ?? 0, polls: p.get(date) ?? 0, forms: f.get(date) ?? 0 }));
  const first = full.findIndex((b) => b.signups || b.polls || b.forms);
  const timeline = first < 0 ? [] : full.slice(first);

  // Top creators by responses received across polls + forms.
  const byCreator = async (model: mongoose.Model<any>) =>
    model.aggregate([
      { $match: live },
      { $group: { _id: "$creatorId", items: { $sum: 1 }, responses: { $sum: { $ifNull: ["$totalResponses", 0] } } } },
    ]);
  const [pc, fc] = await Promise.all([byCreator(Poll), byCreator(Form)]);
  const creators = new Map<string, { polls: number; forms: number; responses: number }>();
  for (const r of pc) creators.set(String(r._id), { polls: r.items, forms: 0, responses: r.responses });
  for (const r of fc) {
    const c = creators.get(String(r._id)) ?? { polls: 0, forms: 0, responses: 0 };
    creators.set(String(r._id), { ...c, forms: r.items, responses: c.responses + r.responses });
  }
  const topIds = [...creators.entries()].sort((a, b) => b[1].responses - a[1].responses).slice(0, 8);
  const topUsers = await User.find({ _id: { $in: topIds.map(([id]) => id) } }).select("name email").lean();
  const nameOf = new Map(topUsers.map((u) => [String(u._id), u]));
  const topCreators = topIds.map(([id, c]) => ({
    id,
    name: nameOf.get(id)?.name ?? "Deleted user",
    email: nameOf.get(id)?.email ?? "",
    ...c,
  }));

  const topContent = async (model: mongoose.Model<any>, kind: "poll" | "form") => {
    const items = await model.find(live).sort({ totalResponses: -1 }).limit(5).select("title status totalResponses creatorId").populate("creatorId", "name").lean();
    return items.map((x: any) => ({ id: String(x._id), kind, title: x.title, status: x.status, responses: x.totalResponses || 0, creator: x.creatorId?.name ?? "—" }));
  };
  const [topPolls, topForms] = await Promise.all([topContent(Poll, "poll"), topContent(Form, "form")]);

  const [plusUsers, proUsers, pendingUpgrades] = await Promise.all([
    User.countDocuments(planFilter("plus")),
    User.countDocuments(planFilter("pro")),
    PlanRequest.countDocuments({ status: "pending" }),
  ]);
  const usage = await User.aggregate([{ $group: { _id: "$onboarding.usage", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);

  return {
    totals: {
      users, verified, googleUsers, newUsers7, newUsers30, activeSessions,
      polls, forms, activePolls, activeForms,
      responses: pollResponses + formResponses, pollResponses, formResponses,
      responses7: pollResponses7 + formResponses7,
    },
    timeline,
    topCreators,
    topContent: [...topPolls, ...topForms].sort((a, b) => b.responses - a.responses).slice(0, 8),
    plans: { free: users - plusUsers - proUsers, plus: plusUsers, pro: proUsers },
    pendingUpgrades,
    audience: usage.map((u) => ({ usage: (u._id as string | null) ?? "unknown", count: u.count as number })),
  };
}

// ─── Users ──────────────────────────────────────────────────────────────────────

const USER_FIELDS = "name email avatarUrl isEmailVerified isActive role googleId hasCompletedOnboarding onboarding createdAt plan";

/** Mongo filter for users whose *effective* plan is `plan` (expired paid plans count as free). */
export function planFilter(plan: PlanId, now = new Date()): Record<string, any> {
  const unexpired = { $or: [{ "plan.expiresAt": null }, { "plan.expiresAt": { $gt: now } }] };
  if (plan === "free") return { $nor: [{ "plan.id": { $in: ["plus", "pro"] }, ...unexpired }] };
  return { "plan.id": plan, ...unexpired };
}

export async function listUsers(opts: { search?: string; page: number; limit: number; plan?: PlanId }) {
  const clauses: Record<string, unknown>[] = [];
  if (opts.search?.trim()) {
    const rx = { $regex: escapeRegex(opts.search.trim()), $options: "i" };
    clauses.push({ $or: [{ name: rx }, { email: rx }] });
  }
  if (opts.plan) clauses.push(planFilter(opts.plan));
  const filter = clauses.length ? { $and: clauses } : {};
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * opts.limit).limit(opts.limit).select(USER_FIELDS).lean(),
  ]);
  const ids = users.map((u) => u._id);

  const countBy = (model: mongoose.Model<any>) =>
    model.aggregate([
      { $match: { creatorId: { $in: ids }, isDeleted: false } },
      { $group: { _id: "$creatorId", n: { $sum: 1 }, responses: { $sum: { $ifNull: ["$totalResponses", 0] } } } },
    ]);
  const [pc, fc, lastSeen] = await Promise.all([
    countBy(Poll),
    countBy(Form),
    Session.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: "$userId", at: { $max: "$updatedAt" } } }]),
  ]);
  const pm = new Map(pc.map((r) => [String(r._id), r]));
  const fm = new Map(fc.map((r) => [String(r._id), r]));
  const lm = new Map(lastSeen.map((r) => [String(r._id), r.at]));

  return {
    items: users.map((u: any) => {
      const id = String(u._id);
      return {
        id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        isEmailVerified: u.isEmailVerified,
        isActive: u.isActive,
        provider: u.googleId ? "google" : "password",
        createdAt: u.createdAt,
        plan: effectivePlan(u),
        planExpiresAt: u.plan?.expiresAt ?? null,
        lastSeenAt: lm.get(id) ?? null,
        polls: pm.get(id)?.n ?? 0,
        forms: fm.get(id)?.n ?? 0,
        responses: (pm.get(id)?.responses ?? 0) + (fm.get(id)?.responses ?? 0),
      };
    }),
    pagination: { page: opts.page, limit: opts.limit, total, totalPages: Math.max(1, Math.ceil(total / opts.limit)) },
  };
}

export async function getUserDetail(userId: string) {
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(404, "User not found");
  const user: any = await User.findById(userId).select(USER_FIELDS).lean();
  if (!user) throw new ApiError(404, "User not found");

  const contentFields = "title status totalResponses shareToken createdAt isDeleted expiresAt";
  const [polls, forms, sessions] = await Promise.all([
    Poll.find({ creatorId: userId }).sort({ createdAt: -1 }).select(contentFields).lean(),
    Form.find({ creatorId: userId }).sort({ createdAt: -1 }).select(`${contentFields} isQuiz`).lean(),
    Session.find({ userId }).sort({ updatedAt: -1 }).limit(10).select("userAgent ipAddress createdAt updatedAt expiresAt isActive").lean(),
  ]);
  const item = (x: any) => ({
    id: String(x._id),
    title: x.title,
    status: x.status,
    responses: x.totalResponses || 0,
    shareToken: x.shareToken,
    createdAt: x.createdAt,
    isDeleted: !!x.isDeleted,
    ...(x.isQuiz != null ? { isQuiz: x.isQuiz } : {}),
  });

  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      provider: user.googleId ? "google" : "password",
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      onboarding: user.onboarding ?? null,
      createdAt: user.createdAt,
      plan: effectivePlan(user),
      assignedPlan: user.plan?.id ?? "free",
      planExpiresAt: user.plan?.expiresAt ?? null,
    },
    polls: polls.map(item),
    forms: forms.map(item),
    sessions: sessions.map((s: any) => ({
      userAgent: s.userAgent ?? "",
      ipAddress: s.ipAddress ?? "",
      createdAt: s.createdAt,
      lastUsedAt: s.updatedAt,
      active: s.isActive && new Date(s.expiresAt) > new Date(),
    })),
  };
}

// ─── Traffic + system ───────────────────────────────────────────────────────────

export const getTraffic = () => getMetricsSnapshot();

const DB_STATES: string[] = ["disconnected", "connected", "connecting", "disconnecting"];

export async function getSystemHealth() {
  const conn = mongoose.connection;
  let pingMs: number | null = null;
  try {
    const t = performance.now();
    await conn.db!.admin().ping();
    pingMs = Math.round((performance.now() - t) * 10) / 10;
  } catch {
    /* reported as null below */
  }

  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const uptimeSec = process.uptime();
  const cores = os.cpus().length || 1;
  const dbState = DB_STATES[conn.readyState] ?? "unknown";
  const loop = getEventLoopDelayMs();

  const checks = [
    { name: "Database", ok: dbState === "connected" && pingMs !== null, detail: pingMs !== null ? `${pingMs} ms ping` : dbState },
    { name: "Event loop", ok: loop.p99 < 200, detail: `p99 ${loop.p99} ms` },
    { name: "Expiry job", ok: !expiryJobStatus.lastError, detail: expiryJobStatus.lastError ?? (expiryJobStatus.lastRunAt ? "running" : "not started") },
  ];

  return {
    status: checks.every((c) => c.ok) ? "healthy" : "degraded",
    checks,
    process: {
      uptimeSec: Math.round(uptimeSec),
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      environment: config.ENVIRONMENT,
      pid: process.pid,
      memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, external: mem.external },
      // Average CPU over the process lifetime, as % of all cores.
      cpuPercent: Math.round(((cpu.user + cpu.system) / 1e6 / uptimeSec / cores) * 1000) / 10,
      eventLoopDelayMs: loop,
    },
    host: {
      cores,
      loadAvg: os.loadavg(), // always [0,0,0] on Windows
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
    },
    database: { state: dbState, pingMs, name: conn.name, host: conn.host },
    sockets: getSocketStats(),
    jobs: { expiry: { ...expiryJobStatus } },
    integrations: [
      { name: "Cloudinary (uploads)", configured: isCloudinaryConfigured() },
      { name: "Resend (email)", configured: !!config.RESEND_API_KEY },
      { name: "Google OAuth", configured: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) },
      { name: "Mistral (AI)", configured: !!config.MISTRAL_API_KEY },
    ],
  };
}

// ─── Storage ────────────────────────────────────────────────────────────────────

// Cloudinary's Admin API is rate limited (~500/hr) — cache its usage for 5 minutes.
let cloudinaryCache: { at: number; data: unknown } | null = null;
const CLOUDINARY_TTL = 5 * 60_000;

async function cloudinaryUsage() {
  if (!isCloudinaryConfigured()) return { configured: false as const };
  if (cloudinaryCache && Date.now() - cloudinaryCache.at < CLOUDINARY_TTL) return cloudinaryCache.data;
  try {
    cloudinary.config({
      cloud_name: config.CLOUDINARY_CLOUD_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const u: any = await cloudinary.api.usage();
    const data = {
      configured: true as const,
      plan: u.plan ?? null,
      storageBytes: u.storage?.usage ?? 0,
      bandwidthBytes: u.bandwidth?.usage ?? 0,
      resources: u.resources ?? 0,
      creditsUsed: u.credits?.usage ?? null,
      creditsLimit: u.credits?.limit ?? null,
      creditsPercent: u.credits?.used_percent ?? null,
    };
    cloudinaryCache = { at: Date.now(), data };
    return data;
  } catch (err: any) {
    return { configured: true as const, error: err?.error?.message ?? err?.message ?? "Cloudinary usage unavailable" };
  }
}

export async function getStorage() {
  const db = mongoose.connection.db!;
  let database: Record<string, unknown> = {};
  try {
    const s = await db.stats();
    database = { dataSize: s.dataSize, storageSize: s.storageSize, indexSize: s.indexSize, objects: s.objects, collections: s.collections };
  } catch (err: any) {
    database = { error: err?.message ?? "dbStats unavailable" };
  }

  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((n) => !n.startsWith("system."));
  const collections = await Promise.all(
    names.map(async (name) => {
      try {
        const [stats]: any[] = await db.collection(name).aggregate([{ $collStats: { storageStats: {} } }]).toArray();
        const st = stats?.storageStats ?? {};
        return { name, count: st.count ?? 0, size: st.size ?? 0, storageSize: st.storageSize ?? 0, indexSize: st.totalIndexSize ?? 0 };
      } catch {
        // Some hosted tiers restrict $collStats; fall back to a count.
        return { name, count: await db.collection(name).estimatedDocumentCount(), size: null, storageSize: null, indexSize: null };
      }
    })
  );
  collections.sort((a, b) => (b.storageSize ?? 0) - (a.storageSize ?? 0) || b.count - a.count);

  // What respondents uploaded, from the sizes we record on each answer.
  const [uploads] = await FormResponse.aggregate([
    { $unwind: "$answers" },
    { $unwind: "$answers.fileUrls" },
    { $group: { _id: null, files: { $sum: 1 }, bytes: { $sum: { $ifNull: ["$answers.fileUrls.size", 0] } } } },
  ]);

  return {
    database,
    collections,
    uploads: { files: uploads?.files ?? 0, bytes: uploads?.bytes ?? 0 },
    cloudinary: await cloudinaryUsage(),
  };
}

// ─── Plans ──────────────────────────────────────────────────────────────────────

export const setPlanSchema = z.object({
  plan: z.enum(PLAN_IDS),
  // null/omitted = no expiry. Must be in the future when set.
  expiresAt: z.coerce.date().nullable().optional(),
}).refine((v) => !v.expiresAt || v.expiresAt > new Date(), { message: "Expiry must be in the future", path: ["expiresAt"] });

export async function setUserPlan(userId: string, input: z.infer<typeof setPlanSchema>, admin: { _id: mongoose.Types.ObjectId; email: string }) {
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(404, "User not found");
  const user: any = await User.findById(userId).select("email plan").lean();
  if (!user) throw new ApiError(404, "User not found");
  const before = { plan: user.plan?.id ?? "free", expiresAt: user.plan?.expiresAt ?? null };
  const plan = {
    id: input.plan,
    ...(input.plan !== "free" && input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    assignedBy: admin._id,
    assignedAt: new Date(),
  };
  await User.updateOne({ _id: userId }, { $set: { plan } });
  await AdminAudit.create({
    adminId: admin._id,
    adminEmail: admin.email,
    action: "user.plan",
    params: { userId, email: user.email, plan: input.plan, expiresAt: plan.expiresAt ?? null },
    result: { before },
  });
  return { plan: input.plan, expiresAt: plan.expiresAt ?? null };
}
