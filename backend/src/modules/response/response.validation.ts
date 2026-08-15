import { z } from "zod";
import mongoose from "mongoose";

const answerItemZodSchema = z.object({
  questionId: z.custom<mongoose.Types.ObjectId>(),
  selectedOptionId: z.custom<mongoose.Types.ObjectId>().nullable().optional(),
  selectedOptionIds: z.array(z.custom<mongoose.Types.ObjectId>()).optional().default([]),
  textResponse: z.string().nullable().optional(),
  skipped: z.boolean(),
});

export const responseZodSchema = z.object({
  pollId: z.custom<mongoose.Types.ObjectId>(),
  respondentId: z.custom<mongoose.Types.ObjectId>().optional(),
  sessionToken: z.string(),
  ipHash: z.string().optional(),
  userAgent: z.string().optional(),
  answers: z.array(answerItemZodSchema),
  isComplete: z.boolean(),
  submittedAt: z.date(),
});

export type IResponse = z.infer<typeof responseZodSchema>;

// Request-facing schema for POST /responses/:pollId.
// pollId comes from the route param; ipHash/userAgent/submittedAt are set server-side.
export const submitResponseSchema = z.object({
  sessionToken: z.string().min(1),
  answers: z.array(answerItemZodSchema).min(1),
  isComplete: z.boolean().default(true),
});

export type ISubmitResponse = z.infer<typeof submitResponseSchema>;
