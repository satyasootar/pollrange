import mongoose, { Schema } from "mongoose";
import type { IFormResponse } from "./form-response.validation.js";

const answerSchema = new Schema({
  questionId: { type: Schema.Types.ObjectId, required: true },
  questionTitleSnapshot: String,
  textValue: { type: String, default: null },
  numberValue: { type: Number, default: null },
  dateValue: { type: String, default: null },
  selectedOptionIds: [String],
  scaleValue: { type: Number, default: null },
  gridValues: [{ row: String, columns: [String] }],
  fileUrls: [{ url: String, name: String, size: Number, mimeType: String }],
  isCorrect: Boolean,
  pointsEarned: Number,
  skipped: { type: Boolean, default: false },
});

const formResponseSchema = new Schema<IFormResponse>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, index: true },
    respondentId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionToken: { type: String, required: true },
    respondentEmail: String,
    ipHash: String,
    userAgent: String,
    answers: [answerSchema],
      payment: {
        selectedOptionIds: [String],
        selectedOptions: [String],
        selectedCount: Number,
        totalAmount: Number,
        message: String,
        upiId: String,
        status: { type: String, enum: ["pending", "paid", "failed"] },
      },
    score: Number,
    totalPoints: Number,
    isComplete: { type: Boolean, required: true },
    submittedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

formResponseSchema.index({ formId: 1, submittedAt: -1 });

// One response per identity per form — race-safe dedup backstop.
formResponseSchema.index({ formId: 1, sessionToken: 1 }, { unique: true });
formResponseSchema.index(
  { formId: 1, respondentId: 1 },
  { unique: true, partialFilterExpression: { respondentId: { $exists: true } } }
);

export const FormResponse = mongoose.model<IFormResponse>("FormResponse", formResponseSchema);
