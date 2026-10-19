import mongoose, { Schema, type Types } from "mongoose";

/**
 * A taker's server-side quiz start: created when they press Start (every quiz except a live one,
 * which starts at the host's Start). Refreshing or opening a second tab resumes it, so time taken
 * (the leaderboard tie-break) and any per-person deadline are measured on server clocks only.
 */
export interface IQuizAttempt {
  formId: Types.ObjectId;
  sessionToken: string;
  respondentId?: Types.ObjectId;
  startedAt: Date;
  /** Per-person: startedAt + the time limit, capped at the quiz's close time. Untimed: the close time, if any. */
  endsAt?: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true },
    sessionToken: { type: String, required: true },
    respondentId: { type: Schema.Types.ObjectId, ref: "User" },
    startedAt: { type: Date, required: true },
    endsAt: Date,
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
