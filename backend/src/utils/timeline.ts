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
