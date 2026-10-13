import mongoose, { Schema } from "mongoose";
import type { IResponse } from "./response.validation.js";
import { receiptStatusSchema } from "../../utils/receipt.js";

const answerItemSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    selectedOptionId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    
    selectedOptionIds: [Schema.Types.ObjectId],

    textResponse: {
      type: String,
      default: null,
    },

    skipped: {
      type: Boolean,
      required: true,
    },
  }
);

const responseSchema = new Schema<IResponse>(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
      index: true,
    },

    respondentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    sessionToken: {
      type: String,
      required: true,
    },

    ipHash: String,

    userAgent: String,

    answers: [answerItemSchema],

    isComplete: {
      type: Boolean,
      required: true,
    },

    receipt: receiptStatusSchema,

    submittedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

responseSchema.index({ pollId: 1, submittedAt: -1 });
responseSchema.index({ pollId: 1, ipHash: 1, submittedAt: 1 });

// One response per identity per poll — the race-safe backstop for duplicate detection.
// respondentId only applies to authenticated responses, so scope its uniqueness with a
// partial filter (nulls from anonymous submissions must not collide).
responseSchema.index(
  { pollId: 1, sessionToken: 1 },
  { unique: true }
);
responseSchema.index(
  { pollId: 1, respondentId: 1 },
  { unique: true, partialFilterExpression: { respondentId: { $exists: true } } }
);

export const ResponseModel = mongoose.model<IResponse>("Response", responseSchema);
