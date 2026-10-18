import type { Request, Response } from "express";
import * as FormService from "./form.service.js";
import * as FormResultsService from "./form-results.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { createFormSchema, updateFormSchema, publishFormSchema, reopenFormSchema } from "./form.validation.js";
import { uploadBufferToCloudinary } from "../../config/cloudinary.js";
import { ApiError } from "../../utils/ApiError.js";

export async function createForm(req: Request, res: Response) {
  const user = (req as any).user;
  const data = createFormSchema.parse(req.body);
  const form = await FormService.createForm(user._id.toString(), data);
  return res.status(201).json(new ApiResponse(201, form, "Form created successfully"));
}

export async function getMyForms(req: Request, res: Response) {
  const user = (req as any).user;
  const { page, limit, status, search } = req.query;
  const result = await FormService.listFormsByCreator(user._id.toString(), {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    status: status as string,
    search: search as string,
  });
  return res.status(200).json(new ApiResponse(200, result, "Forms fetched successfully"));
}

export async function checkSlugAvailability(req: Request, res: Response) {
  const user = (req as any).user;
  const slug = String(req.query.slug ?? "").trim();
  if (!/^[a-zA-Z0-9_-]{3,80}$/.test(slug)) {
    throw new ApiError(400, "Slug must be 3-80 characters using only letters, numbers, hyphens, or underscores");
  }
  const result = await FormService.checkSlugAvailability(user._id.toString(), slug, req.query.formId as string | undefined);
  return res.status(200).json(new ApiResponse(200, result, "Slug availability checked"));
}

export async function getFormDetail(req: Request, res: Response) {
  const user = (req as any).user;
  const { formId } = req.params;
  const form = await FormService.getFormByCreator(user._id.toString(), formId as string);
  return res.status(200).json(new ApiResponse(200, form, "Form details fetched successfully"));
}

export async function updateForm(req: Request, res: Response) {
  const user = (req as any).user;
  const { formId } = req.params;
  const data = updateFormSchema.parse(req.body);
  const form = await FormService.updateForm(user._id.toString(), formId as string, data);
  return res.status(200).json(new ApiResponse(200, form, "Form updated successfully"));
}

export async function deleteForm(req: Request, res: Response) {
  const user = (req as any).user;
  const { formId } = req.params;
  await FormService.deleteForm(user._id.toString(), formId as string);
  return res.status(200).json(new ApiResponse(200, {}, "Form deleted successfully"));
}

export async function duplicateForm(req: Request, res: Response) {
  const user = (req as any).user;
  const { formId } = req.params;
  const form = await FormService.duplicateForm(user._id.toString(), formId as string);
  return res.status(201).json(new ApiResponse(201, form, "Form duplicated successfully"));
}

export async function publishForm(req: Request, res: Response) {
  const user = (req as any).user;
  const { formId } = req.params;
  const { mode } = publishFormSchema.parse(req.body);
  const form = await FormService.publishFormResults(user._id.toString(), formId as string, mode);
  return res.status(200).json(new ApiResponse(200, form, "Form results published successfully"));
}

export async function unpublishForm(req: Request, res: Response) {
  const user = (req as any).user;
  const form = await FormService.unpublishFormResults(user._id.toString(), req.params.formId as string);
  return res.status(200).json(new ApiResponse(200, form, "Form results hidden"));
}

export async function getLeaderboard(req: Request, res: Response) {
  const user = (req as any).user;
  const board = await FormResultsService.getCreatorLeaderboard(user._id.toString(), req.params.formId as string);
  return res.status(200).json(new ApiResponse(200, board, "Leaderboard fetched successfully"));
}

export async function closeForm(req: Request, res: Response) {
  const user = (req as any).user;
  const { formId } = req.params;
  const form = await FormService.closeForm(user._id.toString(), formId as string);
  return res.status(200).json(new ApiResponse(200, form, "Form closed successfully"));
}

export async function reopenForm(req: Request, res: Response) {
  const user = (req as any).user;
  const { formId } = req.params;
  const { expiresAt } = reopenFormSchema.parse(req.body);
  const form = await FormService.reopenForm(user._id.toString(), formId as string, expiresAt);
  return res.status(200).json(new ApiResponse(200, form, "Form reopened successfully"));
}

export async function regenerateToken(req: Request, res: Response) {
  const user = (req as any).user;
  const { formId } = req.params;
  const result = await FormService.regenerateShareToken(user._id.toString(), formId as string);
  return res.status(200).json(new ApiResponse(200, result, "Share token regenerated successfully"));
}

// ─── Public ─────────────────────────────────────────────────────────────────────
export async function getPublicForm(req: Request, res: Response) {
  const { shareToken } = req.params;
  const { sessionToken } = req.query;
  const user = (req as any).user;
  const form = await FormService.getPublicForm(shareToken as string, {
    sessionToken: sessionToken as string,
    userId: user?._id?.toString(),
  });
  return res.status(200).json(new ApiResponse(200, form, "Public form fetched successfully"));
}

export async function getPublicResults(req: Request, res: Response) {
  const user = (req as any).user;
  const results = await FormResultsService.getPublicResults(req.params.shareToken as string, {
    sessionToken: req.query.sessionToken as string | undefined,
    userId: user?._id?.toString(),
  });
  return res.status(200).json(new ApiResponse(200, results, "Quiz results fetched successfully"));
}

export async function getFormStatus(req: Request, res: Response) {
  const { shareToken } = req.params;
  const { sessionToken } = req.query;
  const user = (req as any).user;
  const status = await FormService.checkFormStatus(shareToken as string, {
    sessionToken: sessionToken as string,
    userId: user?._id?.toString(),
  });
  return res.status(200).json(new ApiResponse(200, status, "Form status fetched successfully"));
}

// ─── Creator cover-image upload ───────────────────────────────────────────────────
export async function uploadImage(req: Request, res: Response) {
  const file = (req as any).file;
  if (!file) throw new ApiError(400, "No file provided");
  const url = await uploadBufferToCloudinary(file.buffer, "kollects/forms", file.mimetype);
  return res.status(200).json(new ApiResponse(200, { url }, "Image uploaded successfully"));
}
