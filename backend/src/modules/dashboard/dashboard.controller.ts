import type { Request, Response } from "express";
import * as DashboardService from "./dashboard.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { parseGranularity } from "../../utils/timeline.js";

export async function getOverview(req: Request, res: Response) {
  const user = (req as any).user;
  const groupBy = parseGranularity(req.query.groupBy);
  const data = await DashboardService.getDashboardOverview(String(user._id), groupBy);
  return res.status(200).json(new ApiResponse(200, data, "Dashboard overview fetched successfully"));
}
