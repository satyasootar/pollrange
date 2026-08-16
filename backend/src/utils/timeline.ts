import mongoose from "mongoose";
import type { Model } from "mongoose";

export type Granularity = "minute" | "hour" | "day" | "week" | "month";

// $dateToString formats per bucket size (UTC).
const FORMAT: Record<Granularity, string> = {
  minute: "%Y-%m-%d %H:%M",
  hour: "%Y-%m-%d %H:00",
  day: "%Y-%m-%d",
  week: "%G-W%V",
  month: "%Y-%m",
};

// How far back to look per granularity, so the point count stays sane.
const WINDOW_DAYS: Record<Granularity, number> = {
  minute: 1,
  hour: 7,
  day: 30,
  week: 180,
  month: 730,
};

export function parseGranularity(value: unknown): Granularity {
  return value === "minute" || value === "hour" || value === "week" || value === "month" ? value : "day";
}

// ─── Zero-fill helpers ──────────────────────────────────────────────────────────
// The aggregation only emits buckets that have responses. Charts need a continuous
// series, so we generate every bucket across the window (UTC) and left-join counts,
// defaulting the gaps to 0. Keys are generated to match Mongo's $dateToString output.

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO week-year + week number key, matching Mongo's "%G-W%V". */
function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day); // shift to the Thursday of this week
  const isoYear = t.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${isoYear}-W${pad(weekNo)}`;
}

function bucketKey(d: Date, g: Granularity): string {
  const Y = d.getUTCFullYear();
  const M = pad(d.getUTCMonth() + 1);
  const D = pad(d.getUTCDate());
  const H = pad(d.getUTCHours());
  switch (g) {
    case "minute": return `${Y}-${M}-${D} ${H}:${pad(d.getUTCMinutes())}`;
    case "hour": return `${Y}-${M}-${D} ${H}:00`;
    case "day": return `${Y}-${M}-${D}`;
    case "week": return isoWeekKey(d);
    case "month": return `${Y}-${M}`;
  }
}

function truncate(d: Date, g: Granularity): Date {
  const t = new Date(d.getTime());
  t.setUTCSeconds(0, 0);
  if (g === "minute") return t;
  t.setUTCMinutes(0);
  if (g === "hour") return t;
  t.setUTCHours(0);
  if (g === "day") return t;
  if (g === "month") { t.setUTCDate(1); return t; }
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() || 7) - 1)); // week: back to Monday
  return t;
}

function advance(d: Date, g: Granularity): Date {
  const t = new Date(d.getTime());
  if (g === "minute") t.setUTCMinutes(t.getUTCMinutes() + 1);
  else if (g === "hour") t.setUTCHours(t.getUTCHours() + 1);
  else if (g === "day") t.setUTCDate(t.getUTCDate() + 1);
  else if (g === "week") t.setUTCDate(t.getUTCDate() + 7);
  else t.setUTCMonth(t.getUTCMonth() + 1);
  return t;
}

/** Every bucket key across the granularity's window, oldest → newest (UTC). */
export function bucketKeys(groupBy: Granularity): string[] {
  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS[groupBy]);
  const now = new Date();
  const keys: string[] = [];
  const seen = new Set<string>();
  for (let d = truncate(since, groupBy); d <= now; d = advance(d, groupBy)) {
    const k = bucketKey(d, groupBy);
    if (!seen.has(k)) { seen.add(k); keys.push(k); }
  }
  const nowKey = bucketKey(now, groupBy);
  if (!seen.has(nowKey)) keys.push(nowKey);
  return keys;
}

/**
 * Turns sparse aggregation rows into a continuous zero-filled series. Leading
 * all-zero buckets (before the first response) are trimmed so a young poll
 * doesn't render a long flat run; internal gaps and the tail keep their zeros.
 */
export function fillSeries(raw: { date: string; count: number }[], groupBy: Granularity): { date: string; count: number }[] {
  if (!raw.length) return [];
  const counts = new Map(raw.map((r) => [r.date, r.count]));
  const series = bucketKeys(groupBy).map((date) => ({ date, count: counts.get(date) ?? 0 }));
  const first = series.findIndex((p) => p.count > 0);
  return first <= 0 ? series : series.slice(first);
}

/**
 * Buckets a collection's documents into response counts by time granularity.
 * ponytail: buckets are UTC — add a timezone param if per-viewer local time matters.
 */
export async function aggregateTimeline(
  model: Model<any>,
  idField: string,
  id: string,
  groupBy: Granularity
): Promise<{ date: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS[groupBy]);
  const rows = await model.aggregate([
    { $match: { [idField]: new mongoose.Types.ObjectId(id), submittedAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: FORMAT[groupBy], date: "$submittedAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r: any) => ({ date: r._id as string, count: r.count as number }));
}

/** Same bucketing, but across many documents (e.g. all of a user's polls). */
export async function aggregateTimelineForIds(
  model: Model<any>,
  idField: string,
  ids: mongoose.Types.ObjectId[],
  groupBy: Granularity
): Promise<{ date: string; count: number }[]> {
  if (!ids.length) return [];
  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS[groupBy]);
  const rows = await model.aggregate([
    { $match: { [idField]: { $in: ids }, submittedAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: FORMAT[groupBy], date: "$submittedAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r: any) => ({ date: r._id as string, count: r.count as number }));
}
