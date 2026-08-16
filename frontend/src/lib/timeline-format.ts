import type { TimelineGranularity } from "@/types";
import { formatDate } from "@/lib/utils";

export const TIMELINE_GRANULARITIES: { value: TimelineGranularity; label: string }[] = [
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Turns a bucket key (per granularity) into a compact human-readable axis/tooltip label. */
export function formatTimelineLabel(date: string, g: TimelineGranularity): string {
  if (g === "minute") {
    const d = new Date(date.replace(" ", "T") + ":00");
    return isNaN(d.getTime()) ? date : d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (g === "hour") {
    const d = new Date(date.replace(" ", "T") + ":00");
    return isNaN(d.getTime()) ? date : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit" });
  }
  if (g === "month") {
    const d = new Date(date + "-01");
    return isNaN(d.getTime()) ? date : d.toLocaleString(undefined, { month: "short", year: "numeric" });
  }
  if (g === "week") return date.replace("-W", " W"); // e.g. "2026 W33"
  return formatDate(date);
}
