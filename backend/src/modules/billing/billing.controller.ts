import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { publicCatalog } from "../../config/plans.js";
import * as BillingService from "./billing.service.js";
import * as PlanRequests from "./plan-request.service.js";

export async function getPlans(_req: Request, res: Response) {
  return res.status(200).json(new ApiResponse(200, publicCatalog(), "ok"));
}

export async function getMyPlan(req: Request, res: Response) {
  const user = (req as any).user;
  return res.status(200).json(new ApiResponse(200, await BillingService.getPlanState(String(user._id)), "ok"));
}

export async function createRequest(req: Request, res: Response) {
  const user = (req as any).user;
  const data = PlanRequests.createRequestSchema.parse(req.body);
  return res.status(201).json(new ApiResponse(201, await PlanRequests.createRequest(String(user._id), data), "Upgrade request sent"));
}

export async function myRequests(req: Request, res: Response) {
  return res.status(200).json(new ApiResponse(200, await PlanRequests.myRequests(String((req as any).user._id)), "ok"));
}

export async function cancelRequest(req: Request, res: Response) {
  const data = await PlanRequests.cancelRequest(String((req as any).user._id), String(req.params.requestId));
  return res.status(200).json(new ApiResponse(200, data, "Request cancelled"));
}
