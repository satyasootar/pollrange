import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { publicCatalog } from "../../config/plans.js";
import * as BillingService from "./billing.service.js";

export async function getPlans(_req: Request, res: Response) {
  return res.status(200).json(new ApiResponse(200, publicCatalog(), "ok"));
}

export async function getMyPlan(req: Request, res: Response) {
  const user = (req as any).user;
  return res.status(200).json(new ApiResponse(200, await BillingService.getPlanState(String(user._id)), "ok"));
}
