import { z } from "zod";
import mongoose from "mongoose";

const optionCountZodSchema = z.object({
  optionId: z.custom<mongoose.Types.ObjectId>(),

  count: z.number(),

  percentage: z.number(),
});

const questionStatZodSchema = z.object({
  questionId: z.custom<mongoose.Types.ObjectId>(),

  optionCounts: z.array(optionCountZodSchema),

  skippedCount: z.number(),

  responseCount: z.number(),
});

const timeSeriesDataZodSchema = z.object({
  hour: z.date(),

  count: z.number(),
});

export const analyticsSnapshotZodSchema = z.object({
  pollId: z.custom<mongoose.Types.ObjectId>(),

  snapshotAt: z.date(),

  totalResponses: z.number(),

  questionStats: z.array(questionStatZodSchema),

  timeSeriesData: z.array(timeSeriesDataZodSchema),
});

export type IAnalyticsSnapshot = z.infer<typeof analyticsSnapshotZodSchema>;
