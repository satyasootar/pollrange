/** Formatting helpers for the admin dashboard. */

import type { AdminEndpoint, FormCleanupFilter, FormStatus, ReportDays } from "@/types";

export const statusTone = (status: string) =>
  status === "active" || status === "published" ? "good" : status === "draft" ? "muted" : "warn";

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(sec % 60)}s`;
}

export const formatNumber = (n: number) => n.toLocaleString("en-IN");

/** bad: ≥5% server errors or p95 ≥ 2s · warn: any 5xx or p95 ≥ 500ms · otherwise good. */
export function endpointHealth(e: Pick<AdminEndpoint, "errorRate" | "errors" | "p95">): "good" | "warn" | "bad" {
  if (e.errorRate >= 5 || e.p95 >= 2000) return "bad";
  if (e.errors > 0 || e.p95 >= 500) return "warn";
  return "good";
}

/** Local calendar days → an inclusive ISO range (start of `from` to end of `to`). */
export function toCleanupFilter(from: string, to: string, statuses: FormStatus[], onlyTrashed: boolean): FormCleanupFilter {
  return {
    from: new Date(`${from}T00:00:00`).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
    ...(statuses.length ? { statuses } : {}),
    onlyTrashed,
  };
}

/** Report windows for the site analytics and consent tabs. */
export const DAY_OPTIONS: { value: ReportDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];
