import mongoose, { Schema } from "mongoose";

/**
 * One document per user per calendar month ("YYYY-MM", UTC). A new month is a new
 * key, so counters reset without any job. Incremented atomically with $inc + upsert.
 */
const usageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    period: { type: String, required: true },
    responses: { type: Number, default: 0 },
    uploads: { type: Number, default: 0 },
    aiMessages: { type: Number, default: 0 },
    // Per-metric "already told them" flags so warnings fire once a month.
    notified: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

usageSchema.index({ userId: 1, period: 1 }, { unique: true });

export const Usage = mongoose.model("Usage", usageSchema);

export const currentPeriod = (d = new Date()) => d.toISOString().slice(0, 7);
