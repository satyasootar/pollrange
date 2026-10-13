import type { PipelineStage } from "mongoose";
import { User } from "../user/user.model.js";
import { ConsentRecord, TrackEvent } from "./site-analytics.model.js";

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

/** Consent rates (each browser's latest choice), decisions over time, and the recent log. */
export async function getConsentReport(days: number) {
  const since = new Date(Date.now() - days * DAY_MS);
  const [currentRows, daily, recent] = await Promise.all([
    ConsentRecord.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$consentId", analytics: { $first: "$analytics" }, marketing: { $first: "$marketing" }, action: { $first: "$action" } } },
      {
        $group: {
          _id: null,
          browsers: { $sum: 1 },
          analytics: { $sum: { $cond: ["$analytics", 1, 0] } },
          marketing: { $sum: { $cond: ["$marketing", 1, 0] } },
          acceptAll: { $sum: { $cond: [{ $eq: ["$action", "accept_all"] }, 1, 0] } },
          rejectAll: { $sum: { $cond: [{ $eq: ["$action", "reject_all"] }, 1, 0] } },
          custom: { $sum: { $cond: [{ $eq: ["$action", "custom"] }, 1, 0] } },
        },
      },
    ]),
    ConsentRecord.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, action: "$action" }, count: { $sum: 1 } } },
    ]),
    ConsentRecord.find().sort({ createdAt: -1 }).limit(50).populate("userId", "name email").lean(),
  ]);

  const current = currentRows[0] ?? { browsers: 0, analytics: 0, marketing: 0, acceptAll: 0, rejectAll: 0, custom: 0 };
  const counts = new Map<string, number>(daily.map((d: any) => [`${d._id.date}|${d._id.action}`, d.count]));
  const inWindow = daily.reduce(
    (acc: Record<string, number>, d: any) => ({ ...acc, [d._id.action]: (acc[d._id.action] ?? 0) + d.count }),
    { accept_all: 0, reject_all: 0, custom: 0 }
  );

  return {
    days,
    current: { ...current, _id: undefined },
    inWindow,
    timeline: dayKeys(days).map((date) => ({
      date,
      accept_all: counts.get(`${date}|accept_all`) ?? 0,
      reject_all: counts.get(`${date}|reject_all`) ?? 0,
      custom: counts.get(`${date}|custom`) ?? 0,
    })),
    recent: recent.map((r: any) => ({
      id: String(r._id),
      consentId: r.consentId,
      user: r.userId ? { id: String(r.userId._id), name: r.userId.name, email: r.userId.email } : null,
      analytics: r.analytics,
      marketing: r.marketing,
      action: r.action,
      source: r.source,
      version: r.version,
      page: r.page ?? null,
      gpc: !!r.gpc,
      device: r.device ?? null,
      browser: r.browser ?? null,
      os: r.os ?? null,
      createdAt: r.createdAt,
    })),
  };
}
