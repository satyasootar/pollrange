import { z } from "zod";
import mongoose from "mongoose";

export const notificationZodSchema = z.object({
  userId: z.custom<mongoose.Types.ObjectId>(),

  type: z.enum(["poll_created", "poll_closed", "poll_published", "system"]),

  title: z.string().min(1).max(100),

  message: z.string().min(1).max(500),

  isRead: z.boolean().default(false),

  relatedPollId: z.custom<mongoose.Types.ObjectId>().optional(),
});

export type INotification = z.infer<typeof notificationZodSchema>;
