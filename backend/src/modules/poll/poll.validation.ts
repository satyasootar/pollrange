import { z } from "zod";
import mongoose from "mongoose";

const optionZodSchema = z.object({
  text: z.string(),
  order: z.number(),
  voteCount: z.number().default(0),
});

const questionZodSchema = z.object({
  text: z.string(),
  type: z.enum(["single_choice", "open_ended"]).default("single_choice"),
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
  expiresAt: z.date(),
  totalResponses: z.number().default(0),
  isDeleted: z.boolean().default(false),
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
