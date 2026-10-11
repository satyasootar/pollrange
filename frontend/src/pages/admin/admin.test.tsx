import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { makeQueryClient } from "@/test/utils";
import { AdminPage, AdminRoute } from "./index";
import { AdminUserPage } from "./user";
import { endpointHealth, formatBytes, formatUptime, toCleanupFilter } from "@/lib/admin-format";
import type { FormCleanupPreview, AdminOverview, AdminSystem, AdminStorage, AdminTraffic, AdminUserDetail, AdminUsersPage } from "@/types";

const API = "http://localhost:3030/api";
const ok = (data: unknown) => HttpResponse.json({ statusCode: 200, success: true, message: "ok", data });

const overview: AdminOverview = {
  totals: {
    users: 1234, verified: 1000, googleUsers: 600, newUsers7: 12, newUsers30: 80, activeSessions: 55,
    polls: 300, forms: 210, activePolls: 40, activeForms: 25,
    responses: 98765, pollResponses: 60000, formResponses: 38765, responses7: 4321,
  },
  timeline: [{ date: "2026-10-10", signups: 3, polls: 10, forms: 4 }],
  topCreators: [{ id: "u1", name: "Asha Rao", email: "asha@x.dev", polls: 3, forms: 2, responses: 900 }],
  topContent: [{ id: "f1", kind: "form", title: "Tech Fest Signup", status: "active", responses: 500, creator: "Asha Rao" }],
  audience: [{ usage: "education", count: 40 }],
};

const usersPage: AdminUsersPage = {
  items: [
    { id: "u1", name: "Asha Rao", email: "asha@x.dev", isEmailVerified: true, isActive: true, provider: "google", createdAt: "2026-01-01T00:00:00Z", lastSeenAt: null, polls: 3, forms: 2, responses: 900 },
    { id: "u2", name: "Ben K", email: "ben@x.dev", isEmailVerified: false, isActive: true, provider: "password", createdAt: "2026-02-01T00:00:00Z", lastSeenAt: null, polls: 0, forms: 1, responses: 4 },
  ],
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

const userDetail: AdminUserDetail = {
  user: { id: "u1", name: "Asha Rao", email: "asha@x.dev", isEmailVerified: true, isActive: true, provider: "google", hasCompletedOnboarding: true, onboarding: { usage: "education" }, createdAt: "2026-01-01T00:00:00Z" },
  forms: [
    { id: "f1", title: "Tech Fest Signup", status: "active", responses: 500, shareToken: "tech-fest", createdAt: "2026-03-01T00:00:00Z", isDeleted: false, isQuiz: false },
    { id: "f2", title: "Old survey", status: "closed", responses: 7, shareToken: "old", createdAt: "2026-02-01T00:00:00Z", isDeleted: true, isQuiz: false },
  ],
  polls: [],
  sessions: [{ userAgent: "Chrome on Windows", ipAddress: "1.2.3.4", createdAt: "2026-10-01T00:00:00Z", lastUsedAt: "2026-10-10T00:00:00Z", active: true }],
};

const point = { t: "2026-10-11T12:00:00Z", requests: 5, errors: 0, clientErrors: 1, avgMs: 12 };
const traffic: AdminTraffic = {
  since: "2026-10-11T10:00:00Z", totalRequests: 4200, requestsPerMinute: 7.5,
  statusClasses: { "2xx": 4000, "3xx": 0, "4xx": 190, "5xx": 10 },
  latencyMs: { p50: 12, p95: 80, p99: 200 },
  lastHour: Array(60).fill(point), last24h: Array(24).fill(point),
  endpoints: [
    { route: "GET /api/forms/:formId", count: 900, clientErrors: 3, errors: 2, errorRate: 0.2, avgMs: 15, p50: 10, p95: 80, p99: 120, maxMs: 300, lastAt: "2026-10-11T12:00:00Z", lastError: { at: "2026-10-11T11:00:00Z", status: 500, message: "cast error" } },
    { route: "POST /api/form-responses/:formId", count: 40, clientErrors: 0, errors: 4, errorRate: 10, avgMs: 900, p50: 700, p95: 2500, p99: 3000, maxMs: 4000, lastAt: "2026-10-11T12:01:00Z", lastError: { at: "2026-10-11T12:01:00Z", status: 502, message: "cloudinary timeout" } },
    { route: "GET /api/auth/me", count: 2000, clientErrors: 10, errors: 0, errorRate: 0, avgMs: 5, p50: 4, p95: 9, p99: 15, maxMs: 40, lastAt: "2026-10-11T12:02:00Z", lastError: null },
  ],
  recentErrors: [{ at: "2026-10-11T11:59:00Z", method: "POST", path: "/api/form-responses/abc", status: 500, message: "boom" }],
};

const system: AdminSystem = {
  status: "degraded",
  checks: [
    { name: "Database", ok: true, detail: "4 ms ping" },
    { name: "Expiry job", ok: false, detail: "connection reset" },
  ],
  process: {
    uptimeSec: 3700, node: "v22.22.2", platform: "linux x64", environment: "production", pid: 1,
    memory: { rss: 150_000_000, heapUsed: 60_000_000, heapTotal: 100_000_000, external: 1 },
    cpuPercent: 3.2, eventLoopDelayMs: { mean: 10, p99: 22, max: 40 },
  },
  host: { cores: 2, loadAvg: [0.1, 0.2, 0.3], totalMem: 4e9, freeMem: 1e9 },
  database: { state: "connected", pingMs: 4, name: "kollects", host: "db" },
  sockets: { connected: 9, rooms: 3 },
  jobs: { expiry: { lastRunAt: "2026-10-11T11:59:00Z", lastError: "connection reset", totalClosed: 4 } },
  integrations: [{ name: "Cloudinary (uploads)", configured: true }, { name: "Mistral (AI)", configured: false }],
};

const storage: AdminStorage = {
  database: { dataSize: 5_000_000, storageSize: 8_000_000, indexSize: 1_000_000, objects: 12000, collections: 9 },
  collections: [{ name: "formresponses", count: 9000, size: 4_000_000, storageSize: 6_000_000, indexSize: 500_000 }],
  uploads: { files: 42, bytes: 30_000_000 },
  cloudinary: { configured: true, plan: "Free", storageBytes: 25_000_000, bandwidthBytes: 1e8, resources: 50, creditsUsed: 1.2, creditsLimit: 25, creditsPercent: 4.8 },
};

function renderAdmin(route: string, isAdmin = true) {
  const qc = makeQueryClient();
  qc.setQueryData(["me"], { _id: "me", email: "satya.sootar06@gmail.com", isAdmin });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/users/:userId" element={<AdminUserPage />} />
          </Route>
          <Route path="/dashboard" element={<div>dashboard-home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const cleanupPreview: FormCleanupPreview = {
  forms: 2, byStatus: { closed: 1, active: 1 }, trashed: 0, live: 1, responses: 30,
  files: { count: 4, bytes: 2_000_000 }, images: 3, assets: { toDelete: 6, keptShared: 1, external: 0 },
  sample: [
    { id: "f1", title: "Old fest", status: "closed", isDeleted: false, createdAt: "2025-01-02T00:00:00Z", responses: 20, creator: "a@x.dev" },
    { id: "f2", title: "Live poll form", status: "active", isDeleted: false, createdAt: "2025-01-03T00:00:00Z", responses: 10, creator: "b@x.dev" },
  ],
};

let requested: string[] = [];
let cleanupBodies: Record<string, unknown>[] = [];
beforeEach(() => {
  requested = [];
  cleanupBodies = [];
  server.use(
    http.post(`${API}/admin/cleanup/forms/preview`, async ({ request }) => {
      cleanupBodies.push({ preview: true, ...((await request.json()) as object) });
      return ok(cleanupPreview);
    }),
    http.post(`${API}/admin/cleanup/forms`, async ({ request }) => {
      cleanupBodies.push((await request.json()) as Record<string, unknown>);
      return ok({ formsDeleted: 2, responsesDeleted: 30, assets: { deleted: 6, notFound: 0, failed: 0, attempted: 6, keptShared: 1 }, bytesFreed: 2_000_000 });
    }),
    http.get(`${API}/admin/audit`, () => ok([])),
    http.get(`${API}/admin/:section`, ({ params, request }) => {
      requested.push(new URL(request.url).pathname + new URL(request.url).search);
      const map: Record<string, unknown> = { overview, users: usersPage, traffic, system, storage };
      return ok(map[params.section as string]);
    }),
    http.get(`${API}/admin/users/:userId`, ({ params }) =>
      params.userId === "u1" ? ok(userDetail) : HttpResponse.json({ message: "Not found" }, { status: 404 })
    )
  );
});

describe("Admin dashboard", () => {
  it("redirects non-admins away without calling the admin API", async () => {
    renderAdmin("/admin", false);
    expect(await screen.findByText("dashboard-home")).toBeInTheDocument();
    expect(requested).toEqual([]);
  });

  it("overview shows platform totals, top creators and most-answered content", async () => {
    renderAdmin("/admin");
    expect(await screen.findByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("98,765")).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Tech Fest Signup")).toBeInTheDocument();
  });

  it("users tab lists users, searches server-side, and opens a user's forms", async () => {
    renderAdmin("/admin?tab=users");
    expect(await screen.findByText("asha@x.dev")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("unverified")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search users"), "ben");
    await screen.findByText("ben@x.dev");
    expect(requested.some((r) => r.includes("/admin/users") && r.includes("search=ben"))).toBe(true);

    await userEvent.click(within(table).getByText("Asha Rao"));
    expect(await screen.findByText("Forms (2)")).toBeInTheDocument();
    expect(screen.getByText("deleted")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open tech fest signup/i })).toHaveAttribute("href", expect.stringContaining("tech-fest"));
    expect(screen.queryByRole("link", { name: /open old survey/i })).not.toBeInTheDocument();
    expect(screen.getByText("Chrome on Windows")).toBeInTheDocument();
  });

  it("user page shows not-found for an unknown id", async () => {
    renderAdmin("/admin/users/nope");
    expect(await screen.findByText("User not found.")).toBeInTheDocument();
  });

  it("traffic tab shows rates, routes and recent server errors", async () => {
    renderAdmin("/admin?tab=traffic");
    expect(await screen.findByText("7.5")).toBeInTheDocument();
    expect(screen.getAllByText("80 ms").length).toBeGreaterThan(0);
    expect(screen.getByText("GET /api/auth/me")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("APIs tab lists every endpoint, flags unhealthy ones, filters and shows the last error", async () => {
    renderAdmin("/admin?tab=apis");
    expect(await screen.findByText("/api/form-responses/:formId")).toBeInTheDocument();
    expect(screen.getByText("/api/auth/me")).toBeInTheDocument();
    expect(screen.getByLabelText("health bad")).toBeInTheDocument();
    expect(screen.getByText("2500")).toBeInTheDocument(); // p95 of the slow endpoint

    await userEvent.click(screen.getByLabelText("Only problems"));
    expect(screen.queryByText("/api/auth/me")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("/api/form-responses/:formId"));
    expect(screen.getByText("cloudinary timeout")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Only problems"));
    await userEvent.type(screen.getByLabelText("Filter endpoints"), "auth");
    expect(screen.getByText("/api/auth/me")).toBeInTheDocument();
    expect(screen.queryByText("/api/forms/:formId")).not.toBeInTheDocument();
  });

  it("cleanup: preview, then delete only after typing DELETE, sending the previewed count", async () => {
    renderAdmin("/admin?tab=cleanup");
    await userEvent.click(await screen.findByRole("button", { name: /preview what will be deleted/i }));

    expect(await screen.findByText("Old fest")).toBeInTheDocument();
    expect(screen.getByText(/1 of these forms are still live/i)).toBeInTheDocument();
    expect(screen.getByText("1 shared, kept")).toBeInTheDocument();
    expect(cleanupBodies).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: /delete 2 forms permanently/i }));
    const confirm = await screen.findByRole("button", { name: /^permanently delete$/i });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type delete to confirm/i), "delete");
    expect(confirm).toBeDisabled(); // case-sensitive
    await userEvent.clear(screen.getByLabelText(/type delete to confirm/i));
    await userEvent.type(screen.getByLabelText(/type delete to confirm/i), "DELETE");
    await userEvent.click(confirm);

    expect(await screen.findByText(/cleanup finished/i)).toBeInTheDocument();
    expect(cleanupBodies[1]).toMatchObject({ expectedForms: 2, confirm: "DELETE", onlyTrashed: false });
    expect(cleanupBodies[1]!.from).toBe(cleanupBodies[0]!.from);
  });

  it("cleanup: changing filters after a preview blocks deletion until previewed again", async () => {
    renderAdmin("/admin?tab=cleanup");
    await userEvent.click(await screen.findByRole("button", { name: /preview what will be deleted/i }));
    const del = await screen.findByRole("button", { name: /delete 2 forms permanently/i });
    expect(del).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "closed" }));
    expect(screen.getByText(/filters changed/i)).toBeInTheDocument();
    expect(del).toBeDisabled();
  });

  it("system tab flags a degraded check and shows storage usage", async () => {
    renderAdmin("/admin?tab=system");
    expect(await screen.findByText(/degraded/i)).toBeInTheDocument();
    expect(screen.getByText("Expiry job: connection reset")).toBeInTheDocument();
    expect(screen.getByText("Mistral (AI)")).toBeInTheDocument();
    expect(await screen.findByText("formresponses")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});

describe("admin-format", () => {
  it("rates endpoint health", () => {
    expect(endpointHealth({ errorRate: 0, errors: 0, p95: 100 })).toBe("good");
    expect(endpointHealth({ errorRate: 0.5, errors: 1, p95: 100 })).toBe("warn");
    expect(endpointHealth({ errorRate: 0, errors: 0, p95: 600 })).toBe("warn");
    expect(endpointHealth({ errorRate: 5, errors: 5, p95: 100 })).toBe("bad");
    expect(endpointHealth({ errorRate: 0, errors: 0, p95: 2000 })).toBe("bad");
  });

  it("builds an inclusive local-day cleanup range", () => {
    const f = toCleanupFilter("2025-01-01", "2025-01-31", [], true);
    expect(new Date(f.from).getTime()).toBe(new Date(2025, 0, 1, 0, 0, 0, 0).getTime());
    expect(new Date(f.to).getTime()).toBe(new Date(2025, 0, 31, 23, 59, 59, 999).getTime());
    expect(f).not.toHaveProperty("statuses");
    expect(toCleanupFilter("2025-01-01", "2025-01-02", ["closed"], false).statuses).toEqual(["closed"]);
  });

  it("formats bytes", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(25_000_000)).toBe("24 MB");
    expect(formatBytes(5 * 1024 ** 3)).toBe("5.0 GB");
  });
  it("formats uptime", () => {
    expect(formatUptime(42)).toBe("0m 42s");
    expect(formatUptime(3700)).toBe("1h 1m");
    expect(formatUptime(90000)).toBe("1d 1h");
  });
});
