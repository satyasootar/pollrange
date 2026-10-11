import type { Request, Response } from "express";
import * as AdminService from "./admin.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { parseGranularity } from "../../utils/timeline.js";
import * as Cleanup from "./admin.cleanup.js";
import { PLAN_IDS } from "../../config/plans.js";

const ok = (res: Response, data: unknown) => res.status(200).json(new ApiResponse(200, data, "ok"));

export async function getOverview(req: Request, res: Response) {
  return ok(res, await AdminService.getOverview(parseGranularity(req.query.groupBy)));
}

export async function listUsers(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : undefined;
  const plan = PLAN_IDS.find((p) => p === req.query.plan);
  return ok(res, await AdminService.listUsers({ page, limit, ...(search ? { search } : {}), ...(plan ? { plan } : {}) }));
}

export async function getUser(req: Request, res: Response) {
  return ok(res, await AdminService.getUserDetail(String(req.params.userId)));
}

export async function getTraffic(_req: Request, res: Response) {
  return ok(res, AdminService.getTraffic());
}

export async function getSystem(_req: Request, res: Response) {
  return ok(res, await AdminService.getSystemHealth());
}

export async function getStorage(_req: Request, res: Response) {
  return ok(res, await AdminService.getStorage());
}

export async function previewFormCleanup(req: Request, res: Response) {
  return ok(res, await Cleanup.previewFormCleanup(Cleanup.formCleanupSchema.parse(req.body)));
}

export async function executeFormCleanup(req: Request, res: Response) {
  const user = (req as any).user;
  return ok(res, await Cleanup.executeFormCleanup(Cleanup.executeCleanupSchema.parse(req.body), user));
}

export async function getAudit(_req: Request, res: Response) {
  return ok(res, await Cleanup.recentAudit());
}

export async function setUserPlan(req: Request, res: Response) {
  const input = AdminService.setPlanSchema.parse(req.body);
  return ok(res, await AdminService.setUserPlan(String(req.params.userId), input, (req as any).user));
}
