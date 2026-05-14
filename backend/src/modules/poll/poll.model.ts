import mongoose, { Schema } from "mongoose";
import type { IPoll } from "./poll.validation.js";

const optionSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },

    order: {
      type: Number,
      required: true,
    },

    voteCount: {
      type: Number,
      default: 0,
    },
  }
);

const questionSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["single_choice"],
      default: "single_choice",
    },

    options: [optionSchema],

    isMandatory: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      required: true,
    },
  }
);

const pollSchema = new Schema<IPoll>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: 200,
    },

    description: {
      type: String,
      maxlength: 1000,
    },

    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    questions: [questionSchema],

    responseMode: {
      type: String,
      enum: ["anonymous", "authenticated"],
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "active", "closed", "published"],
      default: "draft",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    totalResponses: {
      type: Number,
      default: 0,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: Date,

    closedAt: Date,

    settings: {
      allowResponseEdit: {
        type: Boolean,
        default: false,
      },
      showProgressBar: {
        type: Boolean,
        default: true,
      },
      randomizeQuestions: {
        type: Boolean,
        default: false,
      },
      randomizeOptions: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

pollSchema.index({ creatorId: 1, createdAt: -1 });

export const Poll = mongoose.model<IPoll>("Poll", pollSchema);
