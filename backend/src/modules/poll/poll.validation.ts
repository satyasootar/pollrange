import { z } from "zod";
import mongoose from "mongoose";

const optionZodSchema = z.object({
  text: z.string(),
  order: z.number(),
  voteCount: z.number().default(0),
});

const questionZodSchema = z.object({
  text: z.string(),
  type: z.enum(["single_choice", "multiple_choice", "open_ended"]).default("single_choice"),
  options: z.array(optionZodSchema).optional(),
  isMandatory: z.boolean().default(true),
  order: z.number(),
});

export const pollZodSchema = z.object({
  creatorId: z.custom<mongoose.Types.ObjectId>(),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  shareToken: z.string(),
  questions: z.array(questionZodSchema),
  responseMode: z.enum(["anonymous", "authenticated"]),
  status: z.enum(["draft", "active", "closed", "published"]).default("draft"),
  expiresAt: z.date().optional().nullable(),
  totalResponses: z.number().default(0),
  isDeleted: z.boolean().default(false),
  isResultsPublic: z.boolean().default(false),
  resultsPublishedAt: z.date().optional(),
  publishedAt: z.date().optional(),
  closedAt: z.date().optional(),
  settings: z.object({
    allowResponseEdit: z.boolean().default(false),
    showProgressBar: z.boolean().default(true),
    randomizeQuestions: z.boolean().default(false),
    randomizeOptions: z.boolean().default(false),
  }).optional(),
});

export type IPoll = z.infer<typeof pollZodSchema>;
export type IQuestion = z.infer<typeof questionZodSchema>;
export type IOption = z.infer<typeof optionZodSchema>;

// ─── Request-facing schemas (whitelist client-editable fields only) ─────────────
// These deliberately EXCLUDE server-controlled fields such as creatorId, shareToken,
// status, totalResponses, voteCount, isDeleted, etc. to prevent mass-assignment.
const createOptionSchema = z.object({
  text: z.string(),
  order: z.number(),
});

const createQuestionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["single_choice", "multiple_choice", "open_ended"]).default("single_choice"),
  options: z.array(createOptionSchema).optional(),
  isMandatory: z.boolean().default(true),
  order: z.number(),
});

export const createPollSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  questions: z.array(createQuestionSchema).min(1),
  responseMode: z.enum(["anonymous", "authenticated"]),
  expiresAt: z.coerce.date().optional().nullable(),
  settings: z.object({
    allowResponseEdit: z.boolean().optional(),
    showProgressBar: z.boolean().optional(),
    randomizeQuestions: z.boolean().optional(),
    randomizeOptions: z.boolean().optional(),
  }).optional(),
});

// All fields optional for PATCH, but any provided field is still validated/whitelisted.
export const updatePollSchema = createPollSchema.partial();

export type ICreatePoll = z.infer<typeof createPollSchema>;
export type IUpdatePoll = z.infer<typeof updatePollSchema>;
 
export const publishPollSchema = z.object({
  mode: z.enum(["live", "permanent"]).default("permanent"),
});

export type IPublishPoll = z.infer<typeof publishPollSchema>;

// Reopen a closed poll: `expiresAt` null/absent means "open forever" (no expiry),
// a date sets a new deadline.
export const reopenPollSchema = z.object({
  expiresAt: z.coerce.date().nullable().optional(),
});

export type IReopenPoll = z.infer<typeof reopenPollSchema>;
