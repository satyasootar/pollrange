import mongoose, { Schema } from "mongoose";
import type { IForm } from "./form.validation.js";
import { QUESTION_TYPES, FORM_STATUSES, RESPONSE_MODES } from "./form.validation.js";

const optionSchema = new Schema({
  text: { type: String, required: true },
  order: { type: Number, required: true },
  imageUrl: String,
  responseCount: { type: Number, default: 0 },
  amount: { type: Number, min: 0, max: 1000000 },
});

const questionSchema = new Schema({
  order: { type: Number, required: true },
  type: { type: String, enum: QUESTION_TYPES, required: true },
  title: { type: String, required: true },
  description: String,
  imageUrl: String,
  isRequired: { type: Boolean, default: false },
  options: [optionSchema],
  payment: {
    enabled: { type: Boolean, default: false },
    upiId: String,
    messageTemplate: String,
    minSelections: { type: Number, min: 0 },
    maxSelections: { type: Number, min: 1 },
  },
  // option _id -> section _id | "submit"
  optionNavigation: { type: Schema.Types.Mixed },
  scaleMin: Number,
  scaleMax: Number,
  scaleMinLabel: String,
  scaleMaxLabel: String,
  rows: [String],
  columns: [String],
  fileConfig: {
    maxFiles: { type: Number, default: 1 },
    maxSizeMb: { type: Number, default: 10 },
    allowedTypes: [String],
  },
  validation: {
    kind: { type: String, enum: ["number_range", "regex", "length"] },
    min: Number,
    max: Number,
    pattern: String,
    message: String,
  },
  points: Number,
  answerKey: {
    correctOptionIds: [String],
    correctText: String,
    feedback: String,
  },
});

const sectionSchema = new Schema({
  title: String,
  description: String,
  order: { type: Number, required: true },
  questions: [questionSchema],
  navigation: {
    type: { type: String, enum: ["next", "submit", "byAnswer"] },
    questionId: String,
  },
});

const formSchema = new Schema<IForm>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    coverImageUrl: String,
    shareToken: { type: String, required: true, unique: true, index: true },
    isQuiz: { type: Boolean, default: false },
    status: { type: String, enum: FORM_STATUSES, default: "draft", index: true },
    responseMode: { type: String, enum: RESPONSE_MODES, required: true },
    expiresAt: { type: Date, index: true },
    totalResponses: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    isResultsPublic: { type: Boolean, default: false },
    publishedAt: Date,
    closedAt: Date,
    resultsPublishedAt: Date,
    settings: {
      collectEmail: { type: Boolean, default: false },
      limitOneResponse: { type: Boolean, default: false },
      allowResponseEdit: { type: Boolean, default: false },
      showProgressBar: { type: Boolean, default: true },
      shuffleQuestions: { type: Boolean, default: false },
      confirmationMessage: String,
      releaseScoreImmediately: { type: Boolean, default: true },
    },
    sections: [sectionSchema],
  },
  { timestamps: true }
);

formSchema.index({ creatorId: 1, createdAt: -1 });

export const Form = mongoose.model<IForm>("Form", formSchema);
