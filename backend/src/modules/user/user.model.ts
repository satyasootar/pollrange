import mongoose, { Schema } from "mongoose";
import type { IUser } from "./user.validation.js";

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    avatarUrl: String,

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: String,

    emailVerificationExpiry: Date,

    passwordResetToken: String,

    passwordResetExpiry: Date,

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ passwordResetToken: 1 });


userSchema.set("toJSON", {
  transform: (_doc, ret: Partial<IUser>) => {
    delete ret.passwordHash;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;

    return ret;
  },
});

export const User = mongoose.model<IUser>("User", userSchema);