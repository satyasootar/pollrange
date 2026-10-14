import type { PipelineStage } from "mongoose";
import { User } from "../user/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ConsentRecord, TrackEvent } from "./site-analytics.model.js";
import { CONSENT_ACTIONS } from "./site-analytics.validation.js";

/** Report windows offered in the admin panel. */
export const REPORT_DAYS = [7, 30, 90] as const;
export const parseDays = (v: unknown) => REPORT_DAYS.find((d) => d === Number(v)) ?? 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const isPageview = { $cond: [{ $eq: ["$type", "pageview"] }, 1, 0] };
const byCount = (field: string, as = "sessions", limit = 10): PipelineStage.FacetPipelineStage[] => [
  { $group: { _id: { $ifNull: [`$${field}`, "unknown"] }, [as]: { $sum: 1 } } },
  { $sort: { [as]: -1 } },
  { $limit: limit },
  { $project: { _id: 0, key: "$_id", [as]: 1 } },
];

/** Every UTC day in the window, so charts show quiet days as zero instead of skipping them. */
function dayKeys(days: number) {
  return Array.from({ length: days }, (_, i) => new Date(Date.now() - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10));
}

/**
 * Site analytics for the admin panel, built from consented visitors only.
 * ponytail: $addToSet-based uniques are fine to ~1M events per window; pre-aggregate daily
 * rollups if the collection outgrows that.
 */
export async function getSiteAnalytics(days: number) {
  const since = new Date(Date.now() - days * DAY_MS);
  const inRange = { createdAt: { $gte: since } };

  const [totalsRows, sessionRows, topPages, daily, events, funnelRows, signupSources, activeNow] = await Promise.all([
    TrackEvent.aggregate([
      { $match: inRange },
      { $group: { _id: null, pageviews: { $sum: isPageview }, visitors: { $addToSet: "$visitorId" }, sessions: { $addToSet: "$sessionId" } } },
      { $project: { _id: 0, pageviews: 1, visitors: { $size: "$visitors" }, sessions: { $size: "$sessions" } } },
    ]),
    // One row per session (its first source/device/landing page), then broken down.
    TrackEvent.aggregate([
      { $match: inRange },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$sessionId",
          source: { $first: "$source" },
          campaign: { $first: "$utm.campaign" },
          device: { $first: "$device" },
          browser: { $first: "$browser" },
          os: { $first: "$os" },
          landing: { $first: "$path" },
          pages: { $sum: isPageview },
          start: { $first: "$createdAt" },
          end: { $last: "$createdAt" },
        },
      },
      {
        $facet: {
          sources: byCount("source"),
          campaigns: [{ $match: { campaign: { $nin: [null, ""] } } }, ...byCount("campaign")],
          devices: byCount("device"),
          browsers: byCount("browser"),
          os: byCount("os"),
          landingPages: byCount("landing"),
          engagement: [
            {
              $group: {
                _id: null,
                sessions: { $sum: 1 },
                bounces: { $sum: { $cond: [{ $lte: ["$pages", 1] }, 1, 0] } },
                pagesPerSession: { $avg: "$pages" },
                avgDurationMs: { $avg: { $subtract: ["$end", "$start"] } },
              },
            },
          ],
        },
      },
    ]),
    TrackEvent.aggregate([
      { $match: { ...inRange, type: "pageview" } },
      { $group: { _id: "$path", views: { $sum: 1 }, visitors: { $addToSet: "$visitorId" } } },
      { $project: { _id: 0, path: "$_id", views: 1, visitors: { $size: "$visitors" } } },
      { $sort: { views: -1 } },
      { $limit: 15 },
    ]),
    TrackEvent.aggregate([
      { $match: { ...inRange, type: "pageview" } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, pageviews: { $sum: 1 }, visitors: { $addToSet: "$visitorId" } } },
      { $project: { _id: 0, date: "$_id", pageviews: 1, visitors: { $size: "$visitors" } } },
    ]),
    TrackEvent.aggregate([
      { $match: { ...inRange, type: "event" } },
      { $group: { _id: "$name", count: { $sum: 1 }, visitors: { $addToSet: "$visitorId" } } },
      { $project: { _id: 0, name: "$_id", count: 1, visitors: { $size: "$visitors" } } },
      { $sort: { count: -1 } },
    ]),
    // Per visitor: did they reach sign-up, sign up, then create something?
    TrackEvent.aggregate([
      { $match: inRange },
      {
        $group: {
          _id: "$visitorId",
          sawSignup: { $max: { $cond: [{ $eq: ["$path", "/auth/register"] }, 1, 0] } },
          signedUp: { $max: { $cond: [{ $eq: ["$name", "signup"] }, 1, 0] } },
          created: { $max: { $cond: [{ $in: ["$name", ["poll_created", "form_created"]] }, 1, 0] } },
        },
      },
      { $group: { _id: null, visitors: { $sum: 1 }, sawSignup: { $sum: "$sawSignup" }, signedUp: { $sum: "$signedUp" }, created: { $sum: "$created" } } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $ifNull: ["$acquisition.source", "unknown"] }, users: { $sum: 1 } } },
      { $sort: { users: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, key: "$_id", users: 1 } },
    ]),
    TrackEvent.distinct("visitorId", { createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } }),
  ]);

  const totals = totalsRows[0] ?? { pageviews: 0, visitors: 0, sessions: 0 };
  const s = sessionRows[0] ?? {};
  const e = s.engagement?.[0];
  const byDay = new Map(daily.map((d: any) => [d.date, d]));
  const f = funnelRows[0] ?? { visitors: 0, sawSignup: 0, signedUp: 0, created: 0 };

  return {
    days,
    activeNow: activeNow.length,
    totals: {
      ...totals,
      bounceRate: e?.sessions ? e.bounces / e.sessions : 0,
      pagesPerSession: e?.pagesPerSession ?? 0,
      avgSessionSeconds: Math.round((e?.avgDurationMs ?? 0) / 1000),
    },
    timeline: dayKeys(days).map((date) => ({ date, pageviews: byDay.get(date)?.pageviews ?? 0, visitors: byDay.get(date)?.visitors ?? 0 })),
    topPages,
    landingPages: s.landingPages ?? [],
    sources: s.sources ?? [],
    campaigns: s.campaigns ?? [],
    devices: s.devices ?? [],
    browsers: s.browsers ?? [],
    os: s.os ?? [],
    events,
    funnel: [
      { step: "Visited the site", visitors: f.visitors },
      { step: "Opened sign-up", visitors: f.sawSignup },
      { step: "Signed up", visitors: f.signedUp },
      { step: "Created a poll or form", visitors: f.created },
    ],
    signupSources,
  };
}

// ─── Consent ────────────────────────────────────────────────────────────────────

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bool = (v: unknown) => (v === "true" ? true : v === "false" ? false : undefined);

export interface ConsentFilters {
  search?: string | undefined;
  action?: (typeof CONSENT_ACTIONS)[number] | undefined;
  analytics?: boolean | undefined;
  marketing?: boolean | undefined;
  source?: "banner" | "settings" | undefined;
  version?: number | undefined;
  gpc?: boolean | undefined;
}

/** Reads the log filters from a query string, ignoring anything malformed. */
export function parseConsentFilters(q: Record<string, unknown>): ConsentFilters {
  const version = Number(q.version);
  return {
    search: typeof q.search === "string" && q.search.trim() ? q.search.trim().slice(0, 100) : undefined,
    action: CONSENT_ACTIONS.find((a) => a === q.action),
    analytics: bool(q.analytics),
    marketing: bool(q.marketing),
    source: (["banner", "settings"] as const).find((s) => s === q.source),
    version: Number.isInteger(version) && version > 0 ? version : undefined,
    gpc: bool(q.gpc),
  };
}

/**
 * Mongo filter for the consent log. `search` matches a consent-ID prefix, a page path,
 * or a signed-in user's name/email.
 */
export async function consentFilter(f: ConsentFilters): Promise<Record<string, unknown>> {
  const where: Record<string, unknown> = {};
  for (const k of ["action", "analytics", "marketing", "source", "version"] as const) if (f[k] !== undefined) where[k] = f[k];
  // Older records may have no gpc field at all, so "not sent" must match those too.
  if (f.gpc !== undefined) where.gpc = f.gpc ? true : { $ne: true };
  if (f.search) {
    const rx = { $regex: escapeRegex(f.search), $options: "i" };
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select("_id").limit(200).lean();
    where.$or = [
      { consentId: { $regex: `^${escapeRegex(f.search)}` } },
      { page: rx },
      ...(users.length ? [{ userId: { $in: users.map((u) => u._id) } }] : []),
    ];
  }
  return where;
}

/** One logged decision as the admin panel shows it. `userId` may be populated with name/email. */
export function toConsentRow(r: any) {
  return {
    id: String(r._id),
    consentId: r.consentId as string,
    user: r.userId?.email ? { id: String(r.userId._id), name: r.userId.name as string, email: r.userId.email as string } : null,
    analytics: r.analytics as boolean,
    marketing: r.marketing as boolean,
    action: r.action as (typeof CONSENT_ACTIONS)[number],
    source: r.source as "banner" | "settings",
    version: r.version as number,
    page: (r.page ?? null) as string | null,
    gpc: !!r.gpc,
    device: (r.device ?? null) as string | null,
    browser: (r.browser ?? null) as string | null,
    os: (r.os ?? null) as string | null,
    createdAt: r.createdAt as Date,
  };
}
export type ConsentRow = ReturnType<typeof toConsentRow>;

export async function listConsentRecords(f: ConsentFilters, page: number, limit: number) {
  const where = await consentFilter(f);
  const [total, rows] = await Promise.all([
    ConsentRecord.countDocuments(where),
    ConsentRecord.find(where).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("userId", "name email").lean(),
  ]);
  return { items: rows.map(toConsentRow), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

/** Every decision one browser made, oldest first: the proof of what it agreed to and when. */
export async function getConsentHistory(consentId: string) {
  const rows = /^[A-Za-z0-9-]{8,64}$/.test(consentId)
    ? (await ConsentRecord.find({ consentId }).sort({ createdAt: 1 }).populate("userId", "name email").lean()).map(toConsentRow)
    : [];
  if (!rows.length) throw new ApiError(404, "No consent records for this ID");
  const users = [...new Map(rows.flatMap((r) => (r.user ? [[r.user.id, r.user] as const] : []))).values()];
  return { consentId, current: rows.at(-1)!, firstSeenAt: rows[0]!.createdAt, decisions: rows, users };
}

export const EXPORT_LIMIT = 10_000;
const CSV_HEADER = ["when", "consent_id", "decision", "analytics", "campaign", "source", "policy_version", "page", "gpc", "user_email", "device", "browser", "os"];

/** Quotes when needed, and defuses cells a spreadsheet would run as a formula. */
export function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toConsentCsv(rows: ConsentRow[]) {
  const lines = rows.map((r) =>
    [
      new Date(r.createdAt).toISOString(),
      r.consentId,
      r.action,
      r.analytics ? "allowed" : "denied",
      r.marketing ? "allowed" : "denied",
      r.source,
      r.version,
      r.page,
      r.gpc ? "yes" : "no",
      r.user?.email,
      r.device,
      r.browser,
      r.os,
    ]
      .map(csvCell)
      .join(",")
  );
  return [CSV_HEADER.join(","), ...lines].join("\r\n");
}

export async function exportConsentCsv(f: ConsentFilters) {
  const rows = await ConsentRecord.find(await consentFilter(f)).sort({ createdAt: -1 }).limit(EXPORT_LIMIT + 1).populate("userId", "name email").lean();
  return {
    csv: toConsentCsv(rows.slice(0, EXPORT_LIMIT).map(toConsentRow)),
    rows: Math.min(rows.length, EXPORT_LIMIT),
    truncated: rows.length > EXPORT_LIMIT,
  };
}

/** Consent rates (each browser's latest choice), how those choices break down, and decisions over time. */
export async function getConsentReport(days: number) {
  const since = new Date(Date.now() - days * DAY_MS);
  const [[latest], daily] = await Promise.all([
    ConsentRecord.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$consentId",
          analytics: { $first: "$analytics" },
          marketing: { $first: "$marketing" },
          action: { $first: "$action" },
          version: { $first: "$version" },
          source: { $first: "$source" },
          gpc: { $first: "$gpc" },
          decisions: { $sum: 1 },
          everAnalytics: { $max: "$analytics" },
        },
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                browsers: { $sum: 1 },
                analytics: { $sum: { $cond: ["$analytics", 1, 0] } },
                marketing: { $sum: { $cond: ["$marketing", 1, 0] } },
                acceptAll: { $sum: { $cond: [{ $eq: ["$action", "accept_all"] }, 1, 0] } },
                rejectAll: { $sum: { $cond: [{ $eq: ["$action", "reject_all"] }, 1, 0] } },
                custom: { $sum: { $cond: [{ $eq: ["$action", "custom"] }, 1, 0] } },
                gpc: { $sum: { $cond: ["$gpc", 1, 0] } },
                changedMind: { $sum: { $cond: [{ $gt: ["$decisions", 1] }, 1, 0] } },
                // Allowed analytics at some point, but their latest choice doesn't.
                withdrew: { $sum: { $cond: [{ $and: ["$everAnalytics", { $not: ["$analytics"] }] }, 1, 0] } },
              },
            },
            { $project: { _id: 0 } },
          ],
          byVersion: [{ $group: { _id: "$version", browsers: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $project: { _id: 0, version: "$_id", browsers: 1 } }],
          bySource: [{ $group: { _id: "$source", browsers: { $sum: 1 } } }, { $project: { _id: 0, source: "$_id", browsers: 1 } }],
        },
      },
    ]),
    ConsentRecord.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, action: "$action" }, count: { $sum: 1 } } },
    ]),
  ]);

  const current = latest?.totals[0] ?? { browsers: 0, analytics: 0, marketing: 0, acceptAll: 0, rejectAll: 0, custom: 0, gpc: 0, changedMind: 0, withdrew: 0 };
  const counts = new Map<string, number>(daily.map((d: any) => [`${d._id.date}|${d._id.action}`, d.count]));
  const inWindow = daily.reduce(
    (acc: Record<string, number>, d: any) => ({ ...acc, [d._id.action]: (acc[d._id.action] ?? 0) + d.count }),
    { accept_all: 0, reject_all: 0, custom: 0 }
  );

  return {
    days,
    current,
    byVersion: (latest?.byVersion ?? []) as { version: number; browsers: number }[],
    bySource: (latest?.bySource ?? []) as { source: "banner" | "settings"; browsers: number }[],
    inWindow,
    timeline: dayKeys(days).map((date) => ({
      date,
      accept_all: counts.get(`${date}|accept_all`) ?? 0,
      reject_all: counts.get(`${date}|reject_all`) ?? 0,
      custom: counts.get(`${date}|custom`) ?? 0,
    })),
  };
}
