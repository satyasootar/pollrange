import mongoose, { Schema, type Types } from "mongoose";

/**
 * A per-person quiz timer: created when the taker presses Start, so refreshing or opening a
 * second tab resumes the same deadline, and the server can enforce it on submit.
 */
export interface IQuizAttempt {
  formId: Types.ObjectId;
  sessionToken: string;
  respondentId?: Types.ObjectId;
  startedAt: Date;
  /** startedAt + the time limit, capped at the quiz's own close time. */
  endsAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true },
    sessionToken: { type: String, required: true },
    respondentId: { type: Schema.Types.ObjectId, ref: "User" },
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// One attempt per identity per quiz — the race-safe backstop for concurrent Start presses.
quizAttemptSchema.index({ formId: 1, sessionToken: 1 }, { unique: true });
quizAttemptSchema.index(
  { formId: 1, respondentId: 1 },
  { unique: true, partialFilterExpression: { respondentId: { $exists: true } } }
);

export const QuizAttempt = mongoose.model<IQuizAttempt>("QuizAttempt", quizAttemptSchema);
