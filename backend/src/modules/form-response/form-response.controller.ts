import type { Request, Response } from "express";
import * as FormResponseService from "./form-response.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { submitFormResponseSchema } from "./form-response.validation.js";
import { uploadBufferToCloudinary } from "../../config/cloudinary.js";
import crypto from "crypto";
import mongoose from "mongoose";
import { Form } from "../form/form.model.js";
import { consume, refund } from "../billing/billing.service.js";

export async function submitResponse(req: Request, res: Response) {
  const { formId } = req.params;
  const user = (req as any).user;
  const data = submitFormResponseSchema.parse(req.body);

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

  const response = await FormResponseService.submitResponse(formId as string, data, {
    respondentId: user?._id?.toString(),
    userName: user?.name,
    userEmail: user?.email,
    ipHash,
    userAgent: req.headers["user-agent"] || "unknown",
  });

  return res.status(201).json(new ApiResponse(201, response, "Response submitted successfully"));
}

/** Respondent file-upload for a `file_upload` question — returns the CDN URL + metadata. */
export async function uploadResponseFile(req: Request, res: Response) {
  const file = (req as any).file;
  if (!file) throw new ApiError(400, "No file provided");
  if (!(req as any).user) throw new ApiError(401, "Sign in to upload files");
  // Uploads must target a live form; its owner's plan pays for the storage.
  const form = mongoose.isValidObjectId(req.params.formId)
    ? await Form.findOne({ _id: req.params.formId, isDeleted: false, status: "active" }).select("creatorId")
    : null;
  if (!form) throw new ApiError(404, "Form not found or not accepting responses");
  await consume(form.creatorId, "uploads", "respondent");
  let url: string;
  try {
    url = await uploadBufferToCloudinary(file.buffer, "kollects/form-uploads", file.mimetype);
  } catch (err) {
    await refund(form.creatorId, "uploads");
    throw err;
  }
  return res.status(200).json(
    new ApiResponse(200, { url, name: file.originalname, size: file.size, mimeType: file.mimetype }, "File uploaded")
  );
}

export async function getUserHistory(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) throw new ApiError(401, "Authentication is required");
  const history = await FormResponseService.getUserResponseHistory(user._id.toString());
  const filtered = history.filter((item) => item.formId);
  return res.status(200).json(new ApiResponse(200, filtered, "Form response history fetched successfully"));
}
