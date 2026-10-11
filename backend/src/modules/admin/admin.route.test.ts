import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

vi.mock("../../config/config.js", () => ({
  default: { JWT_SECRET: "test-secret", ADMIN_EMAILS: ["satya.sootar06@gmail.com"], ENVIRONMENT: "test" },
}));
vi.mock("../user/user.model.js", () => ({ User: { findById: vi.fn() } }));
vi.mock("./admin.service.js", () => ({
  getOverview: vi.fn(async () => ({ totals: { users: 3 } })),
  listUsers: vi.fn(async () => ({ items: [], pagination: {} })),
  getUserDetail: vi.fn(async () => ({})),
  getTraffic: vi.fn(() => ({ totalRequests: 0 })),
  getSystemHealth: vi.fn(async () => ({ status: "healthy" })),
  getStorage: vi.fn(async () => ({})),
}));

import { User } from "../user/user.model.js";
import * as AdminService from "./admin.service.js";
import adminRouter from "./admin.route.js";
import { errorHandler } from "../../middlewares/error.middleware.js";

const users: Record<string, object> = {
  admin: { _id: "admin", email: "satya.sootar06@gmail.com", isEmailVerified: true, isActive: true },
  adminUpper: { _id: "adminUpper", email: "Satya.Sootar06@Gmail.com", isEmailVerified: true, isActive: true },
  unverified: { _id: "unverified", email: "satya.sootar06@gmail.com", isEmailVerified: false, isActive: true },
  regular: { _id: "regular", email: "someone@else.com", isEmailVerified: true, isActive: true },
};

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/admin", adminRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin`;
});
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  (User.findById as any).mockImplementation((id: string) => ({ select: async () => users[id] ?? null }));
});

const get = (path: string, as?: string) =>
  fetch(`${base}${path}`, as ? { headers: { Authorization: `Bearer ${jwt.sign({ _id: as }, "test-secret")}` } } : {});

describe("admin routes", () => {
  it("rejects anonymous requests", async () => {
    expect((await get("/overview")).status).toBe(401);
    expect(AdminService.getOverview).not.toHaveBeenCalled();
  });

  it("hides the admin API (404) from regular users", async () => {
    for (const path of ["/overview", "/users", "/users/x", "/traffic", "/system", "/storage"]) {
      expect((await get(path, "regular")).status).toBe(404);
    }
    expect(AdminService.getOverview).not.toHaveBeenCalled();
    expect(AdminService.listUsers).not.toHaveBeenCalled();
  });

  it("never lets a regular user reach the destructive cleanup endpoint", async () => {
    const res = await fetch(`${base}/cleanup/forms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.sign({ _id: "regular" }, "test-secret")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "2000-01-01", to: "2100-01-01", expectedForms: 1, confirm: "DELETE" }),
    });
    expect(res.status).toBe(404);
  });

  it("refuses the admin email until it is verified", async () => {
    expect((await get("/overview", "unverified")).status).toBe(404);
  });

  it("serves the allowlisted, verified admin (case-insensitive email)", async () => {
    const res = await get("/overview", "admin");
    expect(res.status).toBe(200);
    expect((await res.json()).data.totals.users).toBe(3);
    expect((await get("/system", "adminUpper")).status).toBe(200);
  });

  it("clamps user-list paging and trims search", async () => {
    await get("/users?page=-4&limit=5000&search=" + "a".repeat(300), "admin");
    const args = (AdminService.listUsers as any).mock.calls[0][0];
    expect(args.page).toBe(1);
    expect(args.limit).toBe(100);
    expect(args.search).toHaveLength(100);
  });
});
