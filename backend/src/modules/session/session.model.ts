import mongoose, { Schema } from "mongoose";
import type { ISession } from "./session.validation.js";

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    refreshToken: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },

    userAgent: String,

    ipAddress: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.model<ISession>("Session", sessionSchema);
