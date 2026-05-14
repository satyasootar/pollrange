import { z } from "zod";
import mongoose from "mongoose";

const answerItemZodSchema = z.object({
  questionId: z.custom<mongoose.Types.ObjectId>(),

  selectedOptionId: z.custom<mongoose.Types.ObjectId>().nullable().optional(),

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
