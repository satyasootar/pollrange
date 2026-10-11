import mongoose, { Schema } from "mongoose";

/** A user's ask to move to a paid plan; the admin approves (assigns the plan) or rejects it. */
const planRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["plus", "pro"], required: true },
    period: { type: String, enum: ["monthly", "yearly"], required: true },
    note: { type: String, maxlength: 500 },
    status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending", index: true },
    adminNote: { type: String, maxlength: 500 },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    decidedAt: Date,
  },
  { timestamps: true }
);

// At most one open request per user; re-requesting updates it instead of stacking.
planRequestSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: "pending" }, name: "one_pending_per_user" });

export const PlanRequest = mongoose.model("PlanRequest", planRequestSchema);
