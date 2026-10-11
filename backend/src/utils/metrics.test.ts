import { describe, it, expect, beforeEach, afterAll } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import { errorHandler } from "../middlewares/error.middleware.js";
import { _resetMetrics, getMetricsSnapshot, metricsMiddleware, recordError, recordRequest } from "./metrics.js";

beforeEach(() => _resetMetrics());

describe("metrics", () => {
  it("buckets requests per minute, counts status classes and errors", () => {
    const now = Date.UTC(2026, 9, 11, 12, 30, 30);
    recordRequest({ method: "GET", route: "/api/x", status: 200, ms: 10, at: now });
    recordRequest({ method: "GET", route: "/api/x", status: 404, ms: 20, at: now });
    recordRequest({ method: "POST", route: "/api/y", status: 500, ms: 90, at: now - 60_000 });

    const s = getMetricsSnapshot(now);
    expect(s.totalRequests).toBe(3);
    expect(s.statusClasses).toEqual({ "2xx": 1, "3xx": 0, "4xx": 1, "5xx": 1 });
    expect(s.lastHour).toHaveLength(60);
    expect(s.lastHour.at(-1)).toMatchObject({ requests: 2, clientErrors: 1, errors: 0, avgMs: 15 });
    expect(s.lastHour.at(-2)).toMatchObject({ requests: 1, errors: 1 });
    expect(s.last24h).toHaveLength(24);
    expect(s.last24h.at(-1)!.requests).toBe(3);
    expect(s.endpoints[0]).toMatchObject({ route: "GET /api/x", count: 2, clientErrors: 1, errors: 0, p50: 20, maxMs: 20 });
    expect(s.endpoints[0]!.lastError).toMatchObject({ status: 404 });
    expect(s.requestsPerMinute).toBe(0.6);
  });

  it("keeps the most recent errors first and truncates long messages", () => {
    recordError({ method: "GET", path: "/a", status: 500, message: "first" });
    recordError({ method: "GET", path: "/b", status: 502, message: "x".repeat(1000) });
    const { recentErrors } = getMetricsSnapshot();
    expect(recentErrors[0]!.path).toBe("/b");
    expect(recentErrors[0]!.message).toHaveLength(300);
  });

  describe("middleware", () => {
    const app = express();
    app.use(metricsMiddleware);
    const r = express.Router();
    r.get("/:formId", (_req, res) => res.json({}));
    app.use("/api/forms", r);
    app.get("/api/admin/overview", (_req, res) => res.json({}));
    const server = app.listen(0);
    const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    afterAll(() => server.close());

    it("records the route pattern (not raw ids), skips admin polling, labels unmatched", async () => {
      await fetch(`${base()}/api/forms/abc123?x=1`);
      await fetch(`${base()}/api/forms/def456`);
      await fetch(`${base()}/api/admin/overview`);
      await fetch(`${base()}/nope`);
      await new Promise((r) => setTimeout(r, 20)); // let "finish" handlers run
      const routes = getMetricsSnapshot().endpoints.map((x) => [x.route, x.count]);
      expect(routes).toContainEqual(["GET /api/forms/:formId", 2]);
      expect(routes).toContainEqual(["GET (unmatched)", 1]);
      expect(routes.some(([route]) => String(route).includes("admin"))).toBe(false);
    });
  });

  it("computes per-endpoint percentiles and error rates", () => {
    for (let i = 1; i <= 100; i++) recordRequest({ method: "GET", route: "/api/slow", status: i <= 5 ? 500 : 200, ms: i, error: i <= 5 ? "db timeout" : undefined });
    const ep = getMetricsSnapshot().endpoints.find((e) => e.route === "GET /api/slow")!;
    expect(ep).toMatchObject({ count: 100, errors: 5, errorRate: 5, p50: 51, p95: 96, p99: 100, maxMs: 100 });
    expect(ep.lastError).toMatchObject({ status: 500, message: "db timeout" });
  });

  it("captures the error handler's message for failing endpoints", async () => {
    const app = express();
    app.use(metricsMiddleware);
    app.get("/api/boom/:id", () => {
      throw new Error("kaboom");
    });
    app.use(errorHandler);
    const srv = app.listen(0);
    await new Promise((r) => srv.once("listening", r));
    await fetch(`http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/boom/42`);
    await new Promise((r) => setTimeout(r, 20));
    srv.close();
    const snap = getMetricsSnapshot();
    expect(snap.endpoints.find((e) => e.route === "GET /api/boom/:id")).toMatchObject({ errors: 1, lastError: { status: 500, message: "kaboom" } });
    expect(snap.recentErrors[0]).toMatchObject({ path: "/api/boom/42", message: "kaboom" });
  });
});
