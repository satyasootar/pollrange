import type { Types } from "mongoose";
import { Form } from "./form.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { emitFormStatusChange } from "../../socket/index.js";
import { GRADABLE_TYPES } from "./form.validation.js";

/** A submit that was in flight when the timer hit zero still counts for this long after the deadline. */
export const SUBMIT_GRACE_MS = 15_000;
/** How many leaderboard rows the public results page shows. */
export const PUBLIC_LEADERBOARD_LIMIT = 50;
const CREATOR_LEADERBOARD_LIMIT = 200;

export const isResultsPublished = (form: { isResultsPublic?: boolean; status?: string }) =>
  !!form.isResultsPublic || form.status === "published";

/** Points a question can actually award (only gradable types are ever graded). */
export const pointsOf = (q: any): number => (GRADABLE_TYPES.includes(q.type) ? q.points ?? 0 : 0);

/** Questions in display order (sections and questions are stored with an `order`). */
export function orderedQuestions(form: any): any[] {
  return [...(form.sections ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .flatMap((s) => [...(s.questions ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
}

export const maxPointsOf = (form: any) => orderedQuestions(form).reduce((sum, q) => sum + pointsOf(q), 0);

/**
 * Closes an active form once its deadline (plus grace) has passed. A quiz set to
 * auto-publish releases its results at the same moment. Conditional update, so
 * concurrent callers (job + page loads) settle it exactly once.
 */
export async function settleExpiredForm<T extends Record<string, any>>(form: T, now = new Date()): Promise<T> {
  if (form.status !== "active" || !form.expiresAt) return form;
  if (new Date(form.expiresAt).getTime() + SUBMIT_GRACE_MS > now.getTime()) return form;

  const autoPublish = !!form.isQuiz && !!form.settings?.autoPublishResults;
  const set = autoPublish
    ? { status: "published", closedAt: now, isResultsPublic: true, publishedAt: now, resultsPublishedAt: now }
    : { status: "closed", closedAt: now };
  const res = await Form.updateOne({ _id: form._id, status: "active" }, { $set: set });
  // Reflect what's now persisted (another caller may have won the race with the same values).
  Object.assign(form, set);
  if (res.modifiedCount > 0) {
    emitFormStatusChange(String(form._id), {
      status: set.status,
      closedAt: now,
      reason: autoPublish ? "published" : "expired",
    });
  }
  return form;
}

export interface LeaderboardRow {
  responseId: string;
  name: string;
  email?: string | null;
  score: number;
  totalPoints: number;
  submittedAt: Date;
}

/**
 * Competition ranking ("1, 1, 3"): equal scores share a rank. Rows must already be
 * sorted by score desc (then submission time, which only orders rows within a tie).
 */
export function assignRanks<T extends { score: number }>(rows: T[]): (T & { rank: number })[] {
  let rank = 0;
  return rows.map((row, i) => {
    if (i === 0 || row.score !== rows[i - 1]!.score) rank = i + 1;
    return { ...row, rank };
  });
}

const displayName = (r: any): string => r.respondentId?.name || r.respondentName || "Anonymous";

async function topRows(formId: Types.ObjectId, limit: number, withEmail: boolean): Promise<(LeaderboardRow & { rank: number })[]> {
  const rows = await FormResponse.find({ formId, score: { $exists: true } })
    .sort({ score: -1, submittedAt: 1 })
    .limit(limit)
    .select("score totalPoints submittedAt respondentName respondentEmail respondentId")
    .populate("respondentId", withEmail ? "name email" : "name")
    .lean();
  return assignRanks(
    rows.map((r: any) => ({
      responseId: String(r._id),
      name: displayName(r),
      ...(withEmail ? { email: r.respondentId?.email ?? r.respondentEmail ?? null } : {}),
      score: r.score ?? 0,
      totalPoints: r.totalPoints ?? 0,
      submittedAt: r.submittedAt,
    }))
  );
}

const rankOf = async (formId: Types.ObjectId, score: number) =>
  (await FormResponse.countDocuments({ formId, score: { $gt: score } })) + 1;

const participantsOf = (formId: Types.ObjectId) => FormResponse.countDocuments({ formId, score: { $exists: true } });

/** Per-question breakdown of one response: what they picked vs. the answer key. */
export function buildReview(form: any, response: any) {
  const answers = new Map<string, any>((response.answers ?? []).map((a: any) => [String(a.questionId), a]));
  return orderedQuestions(form)
    .filter((q) => pointsOf(q) > 0)
    .map((q) => {
      const a = answers.get(String(q._id));
      const optionTexts = (ids: unknown[] = []) =>
        ids.map((id) => q.options?.find((o: any) => String(o._id) === String(id))?.text).filter(Boolean) as string[];
      const isText = q.type === "short_answer";
      const answered = a && !a.skipped;
      return {
        questionId: String(q._id),
        title: q.title as string,
        points: pointsOf(q),
        pointsEarned: a?.pointsEarned ?? 0,
        isCorrect: !!a?.isCorrect,
        yourAnswer: !answered ? [] : isText ? [a.textValue].filter(Boolean) : optionTexts(a.selectedOptionIds),
        correctAnswer: isText ? [q.answerKey?.correctText].filter(Boolean) : optionTexts(q.answerKey?.correctOptionIds),
        ...(q.answerKey?.feedback ? { feedback: q.answerKey.feedback as string } : {}),
      };
    });
}

/**
 * Public results for the quiz link: the viewer's own result (when released), and —
 * once the creator publishes — the leaderboard and their answer review.
 */
export async function getPublicResults(shareToken: string, viewer: { sessionToken?: string | undefined; userId?: string | undefined }) {
  const form = await Form.findOne({ shareToken, isDeleted: false });
  if (!form || form.status === "draft" || !form.isQuiz) throw new ApiError(404, "Quiz not found");
  await settleExpiredForm(form);

  const published = isResultsPublished(form);
  const identity: Record<string, unknown>[] = [];
  if (viewer.userId) identity.push({ formId: form._id, respondentId: viewer.userId });
  if (viewer.sessionToken) identity.push({ formId: form._id, sessionToken: viewer.sessionToken });
  const mine: any = identity.length
    ? await FormResponse.findOne({ $or: identity }).populate("respondentId", "name").lean()
    : null;

  const showScore = !!mine && (published || !!form.settings?.releaseScoreImmediately);
  const myScore = mine?.score ?? 0;
  const maxPoints = maxPointsOf(form);

  let leaderboard = null;
  let myRank: number | undefined;
  if (published) {
    const [rows, participants, rank] = await Promise.all([
      topRows(form._id, PUBLIC_LEADERBOARD_LIMIT, false),
      participantsOf(form._id),
      mine ? rankOf(form._id, myScore) : undefined,
    ]);
    myRank = rank;
    leaderboard = {
      participants,
      maxPoints,
      // responseId stays server-side; the client only needs to know which row is theirs.
      entries: rows.map(({ responseId, ...row }) => ({ ...row, isMe: !!mine && responseId === String(mine._id) })),
    };
  }

  return {
    formId: form._id,
    title: form.title,
    status: form.status,
    expiresAt: form.expiresAt,
    serverTime: new Date(),
    autoPublishResults: !!form.settings?.autoPublishResults,
    resultsPublished: published,
    resultsPublishedAt: form.resultsPublishedAt,
    maxPoints,
    me: mine
      ? {
          name: displayName(mine),
          submittedAt: mine.submittedAt,
          ...(showScore ? { score: myScore, totalPoints: mine.totalPoints ?? maxPoints } : {}),
          ...(myRank !== undefined ? { rank: myRank } : {}),
        }
      : null,
    leaderboard,
    // Answer keys stay secret until results are out and the quiz no longer takes answers.
    review: published && form.status !== "active" && mine ? buildReview(form, mine) : null,
  };
}

/** Creator view: the full ranking (with emails) regardless of publish state. */
export async function getCreatorLeaderboard(userId: string, formId: string) {
  const form = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  await settleExpiredForm(form);
  const [entries, participants] = await Promise.all([
    topRows(form._id, CREATOR_LEADERBOARD_LIMIT, true),
    participantsOf(form._id),
  ]);
  return {
    status: form.status,
    expiresAt: form.expiresAt,
    autoPublishResults: !!form.settings?.autoPublishResults,
    resultsPublished: isResultsPublished(form),
    resultsPublishedAt: form.resultsPublishedAt,
    maxPoints: maxPointsOf(form),
    participants,
    entries,
  };
}
