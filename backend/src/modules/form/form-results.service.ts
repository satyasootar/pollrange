import type { Types } from "mongoose";
import { Form } from "./form.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { emitFormStatusChange, emitQuizLiveState } from "../../socket/index.js";
import { GRADABLE_TYPES } from "./form.validation.js";

/** A submit that was in flight when the timer hit zero still counts for this long after the deadline. */
export const SUBMIT_GRACE_MS = 15_000;
/** Public leaderboard page size; larger pages are capped at PUBLIC_PAGE_MAX. */
export const PUBLIC_PAGE_SIZE = 10;
const PUBLIC_PAGE_MAX = 50;
const HISTOGRAM_MAX_BINS = 10;
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
    if (form.quizTimer?.mode === "live") {
      emitQuizLiveState(String(form._id), { state: "ended", startedAt: form.liveStartedAt, endsAt: form.expiresAt });
    }
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
  /** Timed quizzes only: submit time minus the taker's start. */
  timeTakenMs?: number;
}

/**
 * Unique ranks: a row's rank is its board position. Rows must already be in board order
 * (score desc, then server-measured time taken, then submission), so equal scores rank by speed.
 */
export function assignRanks<T>(rows: T[]): (T & { rank: number })[] {
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

const displayName = (r: any): string => r.respondentId?.name || r.respondentName || "Anonymous";

const ROW_FIELDS = "score totalPoints submittedAt timeTakenMs respondentName respondentEmail respondentId";

function toRow(r: any, withEmail: boolean): LeaderboardRow {
  return {
    responseId: String(r._id),
    name: displayName(r),
    ...(withEmail ? { email: r.respondentId?.email ?? r.respondentEmail ?? null } : {}),
    score: r.score ?? 0,
    totalPoints: r.totalPoints ?? 0,
    submittedAt: r.submittedAt,
    ...(r.timeTakenMs != null ? { timeTakenMs: r.timeTakenMs } : {}),
  };
}

/**
 * Board order: best score first; within a tie the fastest time taken (start and submit are both
 * server times), then the earliest submission, then _id so the order is total.
 * Responses from before time was recorded have no timeTakenMs and fall back to submission order.
 * Served by the (formId, score, timeTakenMs, submittedAt, _id) index.
 */
const boardQuery = (formId: Types.ObjectId) =>
  FormResponse.find({ formId, score: { $exists: true } }).sort({ score: -1, timeTakenMs: 1, submittedAt: 1, _id: 1 });

async function topRows(formId: Types.ObjectId, limit: number, withEmail: boolean): Promise<(LeaderboardRow & { rank: number })[]> {
  const rows = await boardQuery(formId)
    .limit(limit)
    .select(ROW_FIELDS)
    .populate("respondentId", withEmail ? "name email" : "name")
    .lean();
  return assignRanks(rows.map((r: any) => toRow(r, withEmail)));
}

/** Every score on the board, high to low. Index-covered (no documents fetched). */
async function allScores(formId: Types.ObjectId): Promise<number[]> {
  const rows = await boardQuery(formId).select({ score: 1, _id: 0 }).lean();
  return rows.map((r: any) => r.score ?? 0);
}

/** Competition rank of a score within a high→low score list (ties share the rank). */
export const rankIn = (scoresDesc: number[], score: number) => {
  const i = scoresDesc.findIndex((s) => s <= score);
  return (i === -1 ? scoresDesc.length : i) + 1;
};

/**
 * Aggregates for the results page, from every score sorted high to low: average,
 * median, a histogram over 0…maxPoints, and how far the viewer is from the next rank up.
 */
export function scoreStats(scoresDesc: number[], maxPoints: number, myScore?: number) {
  const n = scoresDesc.length;
  const bins = maxPoints > 0 ? Math.min(HISTOGRAM_MAX_BINS, Math.ceil(maxPoints) + 1) : 1;
  const binOf = (s: number) => Math.min(bins - 1, Math.max(0, Math.floor((s / maxPoints) * bins)));
  const histogram = new Array<number>(bins).fill(0);
  for (const s of scoresDesc) histogram[maxPoints > 0 ? binOf(s) : 0]!++;
  const mid = Math.floor(n / 2);
  const median = n === 0 ? 0 : n % 2 ? scoresDesc[mid]! : (scoresDesc[mid - 1]! + scoresDesc[mid]!) / 2;
  const average = n === 0 ? 0 : scoresDesc.reduce((a, b) => a + b, 0) / n;

  let nextUp: { rank: number; gap: number } | undefined;
  if (myScore !== undefined) {
    // The lowest score above mine is the next rank to beat.
    const above = scoresDesc.filter((s) => s > myScore);
    const target = above[above.length - 1];
    if (target !== undefined) nextUp = { rank: rankIn(scoresDesc, target), gap: Math.round((target - myScore) * 100) / 100 };
  }

  return {
    average: Math.round(average * 10) / 10,
    median: Math.round(median * 10) / 10,
    histogram,
    ...(myScore !== undefined && maxPoints > 0 ? { myBin: binOf(myScore) } : {}),
    ...(nextUp ? { nextUp } : {}),
  };
}

/** One page of the board; ranks come from the full score list so they're right at any offset. */
async function pageRows(formId: Types.ObjectId, offset: number, limit: number) {
  const rows = await boardQuery(formId).skip(offset).limit(limit).select(ROW_FIELDS).populate("respondentId", "name").lean();
  return rows.map((r: any, i: number) => ({ ...toRow(r, false), rank: offset + i + 1 }));
}

/** 0-based position of a response on the board (its index in board order). */
async function positionOf(formId: Types.ObjectId, scoresDesc: number[], mine: any) {
  const myScore = mine.score ?? 0;
  // Same submission time: the smaller _id is ahead (boardQuery's last tie-break).
  const earlier = { $or: [{ submittedAt: { $lt: mine.submittedAt } }, { submittedAt: mine.submittedAt, _id: { $lt: mine._id } }] };
  // Mirrors boardQuery's tie order; a missing timeTakenMs sorts before any value (MongoDB null order).
  const tieAhead =
    mine.timeTakenMs == null
      ? { timeTakenMs: null, ...earlier }
      : { $or: [{ timeTakenMs: null }, { timeTakenMs: { $lt: mine.timeTakenMs } }, { timeTakenMs: mine.timeTakenMs, ...earlier }] };
  const sameScoreAhead = await FormResponse.countDocuments({ formId, score: myScore, ...tieAhead });
  return rankIn(scoresDesc, myScore) - 1 + sameScoreAhead;
}

/** The viewer's own response (signed-in account or this browser's session token). */
async function findMine(formId: Types.ObjectId, viewer: Viewer) {
  const identity: Record<string, unknown>[] = [];
  if (viewer.userId) identity.push({ formId, respondentId: viewer.userId });
  if (viewer.sessionToken) identity.push({ formId, sessionToken: viewer.sessionToken });
  return identity.length ? ((await FormResponse.findOne({ $or: identity }).populate("respondentId", "name").lean()) as any) : null;
}

type Viewer = { sessionToken?: string | undefined; userId?: string | undefined };

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

/** Loads a quiz for its public link; 404 for drafts and non-quiz forms. Settles an expired timer first. */
async function loadPublicQuiz(shareToken: string) {
  const form = await Form.findOne({ shareToken, isDeleted: false });
  if (!form || form.status === "draft" || !form.isQuiz) throw new ApiError(404, "Quiz not found");
  await settleExpiredForm(form);
  return form;
}

// responseId stays server-side; the client only needs to know which row is theirs.
const markMine = (rows: (LeaderboardRow & { rank: number })[], mine: any) =>
  rows.map(({ responseId, ...row }) => ({ ...row, isMe: !!mine && responseId === String(mine._id) }));

/**
 * Public results for the quiz link: the viewer's own result (when released), and —
 * once the creator publishes — the first leaderboard page, score stats, the viewer's
 * board position (for "jump to me") and their answer review.
 */
export async function getPublicResults(shareToken: string, viewer: Viewer) {
  const form = await loadPublicQuiz(shareToken);
  const published = isResultsPublished(form);
  const mine = await findMine(form._id, viewer);

  const showScore = !!mine && (published || !!form.settings?.releaseScoreImmediately);
  const myScore = mine?.score ?? 0;
  const maxPoints = maxPointsOf(form);

  let leaderboard = null;
  let myRank: number | undefined;
  if (published) {
    // ponytail: loads every score per request (index-covered, ~10 bytes each); fine into the tens of
    // thousands of responses. Cache per form if a single quiz grows past that.
    const scores = await allScores(form._id);
    const [rows, position] = await Promise.all([
      pageRows(form._id, 0, PUBLIC_PAGE_SIZE),
      mine ? positionOf(form._id, scores, mine) : undefined,
    ]);
    if (position !== undefined) myRank = position + 1;
    leaderboard = {
      participants: scores.length,
      maxPoints,
      pageSize: PUBLIC_PAGE_SIZE,
      entries: markMine(rows, mine),
      stats: scoreStats(scores, maxPoints, mine ? myScore : undefined),
      ...(position !== undefined ? { myPosition: position } : {}),
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
          ...(mine.timeTakenMs != null ? { timeTakenMs: mine.timeTakenMs } : {}),
          ...(showScore ? { score: myScore, totalPoints: mine.totalPoints ?? maxPoints } : {}),
          ...(myRank !== undefined ? { rank: myRank } : {}),
        }
      : null,
    leaderboard,
    // Answer keys stay secret until results are out and the quiz no longer takes answers.
    review: published && form.status !== "active" && mine ? buildReview(form, mine) : null,
  };
}

/** Any page of the published leaderboard (offset into board order). */
export async function getPublicLeaderboardPage(shareToken: string, viewer: Viewer, offset: number, limit: number) {
  const form = await loadPublicQuiz(shareToken);
  if (!isResultsPublished(form)) throw new ApiError(403, "Results are not published yet");
  const safeLimit = Math.min(Math.max(1, Math.floor(limit) || PUBLIC_PAGE_SIZE), PUBLIC_PAGE_MAX);
  const safeOffset = Math.max(0, Math.floor(offset) || 0);
  const [scores, mine] = await Promise.all([allScores(form._id), findMine(form._id, viewer)]);
  const rows = await pageRows(form._id, safeOffset, safeLimit);
  return { participants: scores.length, offset: safeOffset, entries: markMine(rows, mine) };
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
