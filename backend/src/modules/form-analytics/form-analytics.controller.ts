import type { Request, Response } from "express";
import * as FormAnalyticsService from "./form-analytics.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { parseGranularity } from "../../utils/timeline.js";
import { Form } from "../form/form.model.js";

/** Verifies the requester owns the form before any analytics (PII) is returned. */
async function assertOwnership(req: Request): Promise<string> {
  const user = (req as any).user;
  const { formId } = req.params;
  const form = await Form.findOne({ _id: formId, creatorId: user._id, isDeleted: false }).select("_id");
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  return formId as string;
}

export async function getSummary(req: Request, res: Response) {
  const formId = await assertOwnership(req);
  const data = await FormAnalyticsService.getFormSummary(formId);
  return res.status(200).json(new ApiResponse(200, data, "Form summary fetched successfully"));
}

export async function getTimeline(req: Request, res: Response) {
  const formId = await assertOwnership(req);
  const groupBy = parseGranularity(req.query.groupBy);
  const data = await FormAnalyticsService.getFormTimeline(formId, groupBy);
  return res.status(200).json(new ApiResponse(200, data, "Timeline fetched successfully"));
}

export async function getQuestions(req: Request, res: Response) {
  const formId = await assertOwnership(req);
  const data = await FormAnalyticsService.getQuestionSummaries(formId);
  return res.status(200).json(new ApiResponse(200, data, "Question summaries fetched successfully"));
}

export async function getResponses(req: Request, res: Response) {
  const formId = await assertOwnership(req);
  const { page, limit } = req.query;
  const data = await FormAnalyticsService.getIndividualResponses(formId, Number(page) || 1, Number(limit) || 20);
  return res.status(200).json(new ApiResponse(200, data, "Responses fetched successfully"));
}

export async function exportData(req: Request, res: Response) {
  const formId = await assertOwnership(req);
  const csv = await FormAnalyticsService.exportCsv(formId);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="form-${formId}-export.csv"`);
  return res.status(200).send(csv);
}
