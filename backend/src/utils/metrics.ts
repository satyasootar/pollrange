import type { Request, Response, NextFunction } from "express";
import { monitorEventLoopDelay } from "node:perf_hooks";

// ponytail: in-process metrics — reset on restart and per-instance only (matches the
// single-instance assumption of jobs/expiry.job.ts). Move to Prometheus/OTel if we scale out.

const MINUTE = 60_000;
const KEEP_MINUTES = 24 * 60;
const MAX_ROUTES = 300;
const LATENCY_SAMPLES = 2000;
const MAX_ERRORS = 50;
const ROUTE_SAMPLES = 200;

interface Bucket { count: number; e4: number; e5: number; totalMs: number }
interface RouteStat {
  count: number;
  e4: number;
  e5: number;
  totalMs: number;
  maxMs: number;
  samples: number[]; // ring of recent latencies for per-route percentiles
  sIdx: number;
  lastAt: number;
  lastError: { at: string; status: number; message: string } | null;
}
export interface RecentError { at: string; method: string; path: string; status: number; message: string }

const startedAt = Date.now();
const minutes = new Map<number, Bucket>();
const routes = new Map<string, RouteStat>();
const statusClasses = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
const latencies: number[] = [];
let latencyIdx = 0;
let totalRequests = 0;
const recentErrors: RecentError[] = [];

const loopDelay = monitorEventLoopDelay({ resolution: 20 });
loopDelay.enable();

/** Records one finished request. Exported for tests. */
export function recordRequest(r: { method: string; route: string; status: number; ms: number; at?: number; error?: string }) {
  const at = r.at ?? Date.now();
  const minute = Math.floor(at / MINUTE);
  const b = minutes.get(minute) ?? { count: 0, e4: 0, e5: 0, totalMs: 0 };
  b.count++;
  b.totalMs += r.ms;
  if (r.status >= 500) b.e5++;
  else if (r.status >= 400) b.e4++;
  minutes.set(minute, b);
  if (minutes.size > KEEP_MINUTES + 5) {
    for (const k of minutes.keys()) if (k < minute - KEEP_MINUTES) minutes.delete(k);
  }

  const key = `${r.method} ${r.route}`;
  let rs = routes.get(key);
  if (!rs && routes.size < MAX_ROUTES) {
    rs = { count: 0, e4: 0, e5: 0, totalMs: 0, maxMs: 0, samples: [], sIdx: 0, lastAt: 0, lastError: null };
    routes.set(key, rs);
  }
  if (rs) {
    rs.count++;
    rs.totalMs += r.ms;
    rs.maxMs = Math.max(rs.maxMs, r.ms);
    rs.lastAt = at;
    rs.samples[rs.sIdx] = r.ms;
    rs.sIdx = (rs.sIdx + 1) % ROUTE_SAMPLES;
    if (r.status >= 500) rs.e5++;
    else if (r.status >= 400) rs.e4++;
    if (r.status >= 400) rs.lastError = { at: new Date(at).toISOString(), status: r.status, message: (r.error ?? "").slice(0, 300) };
  }

  const cls = `${Math.min(5, Math.max(2, Math.floor(r.status / 100)))}xx` as keyof typeof statusClasses;
  statusClasses[cls]++;
  latencies[latencyIdx] = r.ms;
  latencyIdx = (latencyIdx + 1) % LATENCY_SAMPLES;
  totalRequests++;
}

/** Called by the error handler for 5xx so the admin sees what actually broke. */
export function recordError(e: Omit<RecentError, "at">) {
  recentErrors.unshift({ at: new Date().toISOString(), ...e, message: e.message.slice(0, 300) });
  if (recentErrors.length > MAX_ERRORS) recentErrors.length = MAX_ERRORS;
}

/** Express middleware. Uses the matched route pattern (not the raw URL) to keep cardinality bounded. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const fullPath = req.originalUrl.split("?")[0] ?? "";
    if (fullPath.startsWith("/api/admin")) return; // the dashboard's own polling isn't traffic
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const route = req.route?.path ? `${req.baseUrl}${req.route.path === "/" ? "" : req.route.path}` : "(unmatched)";
    // Set by the error handler so failures carry their message.
    const error = res.locals.errorMessage as string | undefined;
    recordRequest({ method: req.method, route, status: res.statusCode, ms, ...(error ? { error } : {}) });
    if (res.statusCode >= 500) recordError({ method: req.method, path: fullPath, status: res.statusCode, message: error ?? "" });
  });
  next();
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
}

const round = (n: number) => Math.round(n * 10) / 10;

export function getMetricsSnapshot(now = Date.now()) {
  const nowMinute = Math.floor(now / MINUTE);
  const empty: Bucket = { count: 0, e4: 0, e5: 0, totalMs: 0 };

  const lastHour = Array.from({ length: 60 }, (_, i) => {
    const m = nowMinute - 59 + i;
    const b = minutes.get(m) ?? empty;
    return { t: new Date(m * MINUTE).toISOString(), requests: b.count, errors: b.e5, clientErrors: b.e4, avgMs: b.count ? round(b.totalMs / b.count) : 0 };
  });

  const last24h = Array.from({ length: 24 }, (_, i) => {
    const hourStart = nowMinute - (23 - i) * 60 - (nowMinute % 60);
    let count = 0, e5 = 0, e4 = 0, totalMs = 0;
    for (let m = hourStart; m < hourStart + 60; m++) {
      const b = minutes.get(m);
      if (b) { count += b.count; e5 += b.e5; e4 += b.e4; totalMs += b.totalMs; }
    }
    return { t: new Date(hourStart * MINUTE).toISOString(), requests: count, errors: e5, clientErrors: e4, avgMs: count ? round(totalMs / count) : 0 };
  });

  const sorted = [...latencies].sort((a, b) => a - b);
  const last5 = lastHour.slice(-5).reduce((s, b) => s + b.requests, 0);

  return {
    since: new Date(startedAt).toISOString(),
    totalRequests,
    requestsPerMinute: round(last5 / 5),
    statusClasses: { ...statusClasses },
    latencyMs: { p50: round(percentile(sorted, 50)), p95: round(percentile(sorted, 95)), p99: round(percentile(sorted, 99)) },
    lastHour,
    last24h,
    endpoints: [...routes.entries()]
      .map(([route, s]) => {
        const sorted = [...s.samples].sort((a, b) => a - b);
        return {
          route,
          count: s.count,
          clientErrors: s.e4,
          errors: s.e5,
          errorRate: round((s.e5 / s.count) * 100),
          avgMs: round(s.totalMs / s.count),
          p50: round(percentile(sorted, 50)),
          p95: round(percentile(sorted, 95)),
          p99: round(percentile(sorted, 99)),
          maxMs: round(s.maxMs),
          lastAt: new Date(s.lastAt).toISOString(),
          lastError: s.lastError,
        };
      })
      .sort((a, b) => b.count - a.count),
    recentErrors: [...recentErrors],
  };
}

export function getEventLoopDelayMs() {
  // Histogram values are in nanoseconds.
  return { mean: round(loopDelay.mean / 1e6), p99: round(loopDelay.percentile(99) / 1e6), max: round(loopDelay.max / 1e6) };
}

/** Test-only reset. */
export function _resetMetrics() {
  minutes.clear();
  routes.clear();
  for (const k of Object.keys(statusClasses) as (keyof typeof statusClasses)[]) statusClasses[k] = 0;
  latencies.length = 0;
  latencyIdx = 0;
  totalRequests = 0;
  recentErrors.length = 0;
}
