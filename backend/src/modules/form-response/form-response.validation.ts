import { z } from "zod";
import mongoose from "mongoose";

// A single answer. Only the value block matching the question's type is populated.
const gridValueZodSchema = z.object({
  row: z.string(),
  columns: z.array(z.string()).default([]),
});

const fileValueZodSchema = z.object({
  url: z.string(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
});

const formAnswerZodSchema = z.object({
  questionId: z.custom<mongoose.Types.ObjectId>(),
  questionTitleSnapshot: z.string().optional(),
  textValue: z.string().nullable().optional(),
  numberValue: z.number().nullable().optional(),
  dateValue: z.string().nullable().optional(),
  selectedOptionIds: z.array(z.string()).optional().default([]),
  scaleValue: z.number().nullable().optional(),
  gridValues: z.array(gridValueZodSchema).optional().default([]),
  fileUrls: z.array(fileValueZodSchema).optional().default([]),
  isCorrect: z.boolean().optional(),
  pointsEarned: z.number().optional(),
  skipped: z.boolean().default(false),
});

export const formResponseZodSchema = z.object({
  formId: z.custom<mongoose.Types.ObjectId>(),
  respondentId: z.custom<mongoose.Types.ObjectId>().optional(),
  sessionToken: z.string(),
  respondentEmail: z.string().optional(),
  ipHash: z.string().optional(),
  userAgent: z.string().optional(),
  answers: z.array(formAnswerZodSchema),
  score: z.number().optional(),
  totalPoints: z.number().optional(),
  isComplete: z.boolean(),
  submittedAt: z.date(),
});

export type IFormResponse = z.infer<typeof formResponseZodSchema>;
export type IFormAnswer = z.infer<typeof formAnswerZodSchema>;

// Request-facing schema for POST /form-responses/:formId.
const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  textValue: z.string().nullable().optional(),
  numberValue: z.number().nullable().optional(),
  dateValue: z.string().nullable().optional(),
  selectedOptionIds: z.array(z.string()).optional().default([]),
  scaleValue: z.number().nullable().optional(),
  gridValues: z.array(gridValueZodSchema).optional().default([]),
  fileUrls: z.array(fileValueZodSchema).optional().default([]),
  skipped: z.boolean().default(false),
});

export const submitFormResponseSchema = z.object({
  sessionToken: z.string().min(1),
  respondentEmail: z.string().email().optional(),
  answers: z.array(submitAnswerSchema).min(1),
  isComplete: z.boolean().default(true),
});

export type ISubmitFormResponse = z.infer<typeof submitFormResponseSchema>;
export type ISubmitAnswer = z.infer<typeof submitAnswerSchema>;
