import mongoose, { Schema } from "mongoose";

/** Append-only record of destructive admin actions (who, what, filter, outcome). */
const adminAuditSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    params: { type: Schema.Types.Mixed },
    result: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminAuditSchema.index({ createdAt: -1 });

export const AdminAudit = mongoose.model("AdminAudit", adminAuditSchema);
