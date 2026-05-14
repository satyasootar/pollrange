import mongoose, { Schema } from "mongoose";
import type { INotification } from "./notification.validation.js";

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["poll_created", "poll_closed", "poll_published", "system"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    relatedPollId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
