import { FormResponse } from "./form-response.model.js";
import { Form } from "../form/form.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { emitFormAnalyticsUpdate } from "../../socket/index.js";
import { GRADABLE_TYPES } from "../form/form.validation.js";
import type { ISubmitFormResponse, ISubmitAnswer } from "./form-response.validation.js";
import mongoose from "mongoose";
import { calculatePayment } from "../form/payment.util.js";
import { consume, refund } from "../billing/billing.service.js";
import { buildFormReceipt } from "../form-analytics/form-analytics.service.js";
import { sendSubmissionCopy } from "../../utils/receipt.js";
import { pointsOf, settleExpiredForm, SUBMIT_GRACE_MS } from "../form/form-results.service.js";
import { QuizAttempt } from "./quiz-attempt.model.js";

/** This taker's per-person attempt (signed-in account or this browser's session token). */
function findAttempt(formId: unknown, sessionToken: string | undefined, respondentId: string | undefined) {
  const identity: Record<string, unknown>[] = [];
  if (respondentId) identity.push({ formId, respondentId });
  if (sessionToken) identity.push({ formId, sessionToken });
  return identity.length ? QuizAttempt.findOne({ $or: identity }).lean() : Promise.resolve(null);
}

/**
 * Whose clock a timed quiz submission runs on: the host's live start, or the taker's own
 * attempt (whose deadline is enforced here). Null for untimed forms.
 */
async function quizClock(form: any, sessionToken: string, respondentId: string | undefined): Promise<{ startedAt: Date; endsAt: Date | undefined } | null> {
  const mode = form.isQuiz ? form.quizTimer?.mode : undefined;
  if (mode === "live") {
    if (!form.liveStartedAt) throw new ApiError(403, "The quiz hasn't started yet. Wait for the host to start it.");
    return { startedAt: form.liveStartedAt, endsAt: form.expiresAt ?? undefined };
  }
  if (mode === "per_person") {
    const attempt = await findAttempt(form._id, sessionToken, respondentId);
    if (!attempt) throw new ApiError(403, "Press Start on the quiz before submitting.");
    if (Date.now() > attempt.endsAt.getTime() + SUBMIT_GRACE_MS) throw new ApiError(410, "Your time for this quiz is up.");
    return { startedAt: attempt.startedAt, endsAt: attempt.endsAt };
  }
  return null;
}

/** Time from the taker's start to submit, never more than their allowed time (grace submits count as on time). */
function timeTaken(clock: { startedAt: Date; endsAt: Date | undefined }, submittedAt: Date) {
  const end = clock.endsAt ? Math.min(submittedAt.getTime(), clock.endsAt.getTime()) : submittedAt.getTime();
  return Math.max(0, end - clock.startedAt.getTime());
}

/**
 * Per-person timer: starts (or resumes) this taker's attempt. Idempotent: a refresh or a
 * second tab gets the same deadline back, so pressing Start twice never resets the clock.
 */
export async function startQuizAttempt(formId: string, sessionToken: string, respondentId?: string) {
  if (!mongoose.isValidObjectId(formId)) throw new ApiError(404, "Quiz not found");
  const form = await Form.findOne({ _id: formId, isDeleted: false });
  if (!form || !form.isQuiz) throw new ApiError(404, "Quiz not found");
  const minutes = form.quizTimer?.mode === "per_person" ? form.quizTimer.durationMinutes : undefined;
  if (!minutes) throw new ApiError(400, "This quiz has no per-person time limit");
  await settleExpiredForm(form);
  const now = new Date();
  if (form.status !== "active" || (form.expiresAt && form.expiresAt <= now)) throw new ApiError(410, "This quiz has closed");
  if (form.responseMode === "authenticated" && !respondentId) throw new ApiError(401, "Sign in to start this quiz");

  const shape = (a: { startedAt: Date; endsAt: Date }) => ({ startedAt: a.startedAt, endsAt: a.endsAt, serverTime: new Date() });
  const existing = await findAttempt(form._id, sessionToken, respondentId);
  if (existing) return shape(existing);

  const responded = await FormResponse.exists({
    $or: [{ formId: form._id, sessionToken }, ...(respondentId ? [{ formId: form._id, respondentId }] : [])],
  });
  if (responded) throw new ApiError(403, "You have already submitted this quiz");

  const limit = now.getTime() + minutes * 60_000;
  // The quiz's own close time still wins: nobody gets to answer after it shuts.
  const endsAt = new Date(form.expiresAt ? Math.min(limit, form.expiresAt.getTime()) : limit);
  try {
    const attempt = await QuizAttempt.create({ formId: form._id, sessionToken, ...(respondentId ? { respondentId } : {}), startedAt: now, endsAt });
    return shape(attempt);
  } catch (err: any) {
    // Two Start presses raced: return the one that won.
    if (err?.code === 11000) {
      const winner = await findAttempt(form._id, sessionToken, respondentId);
      if (winner) return shape(winner);
    }
    throw err;
  }
}

/** Flattens every question across all sections into one list. */
function allQuestions(form: any): any[] {
  return (form.sections ?? []).flatMap((s: any) => s.questions ?? []);
}

/** Does an answer carry a real value (not skipped / empty)? */
function hasValue(a: ISubmitAnswer): boolean {
  if (a.skipped) return false;
  return (
    (a.textValue != null && a.textValue.trim() !== "") ||
    a.numberValue != null ||
    (a.dateValue != null && a.dateValue !== "") ||
    (a.selectedOptionIds && a.selectedOptionIds.length > 0) ||
    a.scaleValue != null ||
    (a.gridValues && a.gridValues.some((g) => g.columns.length > 0)) ||
    (a.fileUrls && a.fileUrls.length > 0)
  );
}

/**
 * Questions guaranteed to be visible without branching: section 0 plus every
 * section reachable by chaining default "next" navigation. Enforcing required only
 * over these avoids demanding answers to sections hidden behind a branch.
 * ponytail: linear-reachability heuristic — required questions past the first
 * `byAnswer` branch are not server-enforced (client gates them; server backstops).
 */
function linearlyReachableQuestions(form: any): any[] {
  const sections = form.sections ?? [];
  const reached: any[] = [];
  for (const section of sections) {
    reached.push(...(section.questions ?? []));
    const navType = section.navigation?.type;
    if (navType === "submit" || navType === "byAnswer") break;
  }
  return reached;
}

/** Enforces a question's validation rule server-side. Throws 400 on failure. */
function enforceValidation(q: any, a: ISubmitAnswer) {
  const rule = q.validation;
  if (!rule?.kind) return;
  const msg = rule.message || "Answer failed validation";
  if (rule.kind === "length") {
    const len = (a.textValue ?? "").length;
    if (rule.min != null && len < rule.min) throw new ApiError(400, msg);
    if (rule.max != null && len > rule.max) throw new ApiError(400, msg);
  } else if (rule.kind === "regex" && rule.pattern) {
    if (a.textValue && !new RegExp(rule.pattern).test(a.textValue)) throw new ApiError(400, msg);
  } else if (rule.kind === "number_range") {
    const n = a.numberValue ?? Number(a.textValue);
    if (Number.isNaN(n)) throw new ApiError(400, msg);
    if (rule.min != null && n < rule.min) throw new ApiError(400, msg);
    if (rule.max != null && n > rule.max) throw new ApiError(400, msg);
  }
}

/** Grades a single answer against its quiz answer key. */
function gradeAnswer(q: any, a: ISubmitAnswer): { isCorrect: boolean; pointsEarned: number } {
  const points = q.points ?? 0;
  const key = q.answerKey;
  if (!key || points <= 0 || !GRADABLE_TYPES.includes(q.type)) return { isCorrect: false, pointsEarned: 0 };

  let correct = false;
  if (q.type === "short_answer") {
    correct =
      !!key.correctText &&
      (a.textValue ?? "").trim().toLowerCase() === key.correctText.trim().toLowerCase();
  } else {
    const expected = [...(key.correctOptionIds ?? [])].map(String).sort();
    const got = [...(a.selectedOptionIds ?? [])].map(String).sort();
    correct = expected.length > 0 && expected.length === got.length && expected.every((v, i) => v === got[i]);
  }
  return { isCorrect: correct, pointsEarned: correct ? points : 0 };
}

export async function submitResponse(
  formId: string,
  data: ISubmitFormResponse,
  meta: { respondentId?: string; userName?: string; userEmail?: string; ipHash: string; userAgent: string }
) {
  const form = await Form.findOne({ _id: formId, isDeleted: false, status: "active" });
  if (!form) throw new ApiError(404, "Form not found or not active");

  await settleExpiredForm(form);
  if (form.status !== "active") throw new ApiError(410, "This form has expired");
  const clock = await quizClock(form, data.sessionToken, meta.respondentId);
  const deadline = clock?.endsAt ?? form.expiresAt ?? undefined;
  // Only honoured at the deadline: lets a quiz timer flush partial answers past required/validation rules.
  const timedOut = !!data.timedOut && !!deadline && Date.now() >= deadline.getTime() - 5_000;

  if (form.responseMode === "authenticated" && !meta.respondentId) {
    throw new ApiError(401, "Authentication is required to submit this form");
  }

  if (form.settings?.collectEmail && !meta.respondentId && !data.respondentEmail) {
    throw new ApiError(400, "This form requires your email address");
  }

  const questionsById = new Map<string, any>(allQuestions(form).map((q) => [q._id.toString(), q]));
  const answersById = new Map<string, ISubmitAnswer>(data.answers.map((a) => [a.questionId, a]));

  // Required-question enforcement over linearly-reachable sections.
  for (const q of timedOut ? [] : linearlyReachableQuestions(form)) {
    if (!q.isRequired) continue;
    const a = answersById.get(q._id.toString());
    if (!a || !hasValue(a)) {
      throw new ApiError(400, `A required question was not answered: "${q.title}"`);
    }
  }

  // Per-answer validation rules.
  for (const a of data.answers) {
    const q = questionsById.get(a.questionId);
    if (q && !a.skipped && !timedOut) enforceValidation(q, a);
  }

  // Dedup pre-check (unique indexes are the race-safe backstop below).
  const dupFilters: any[] = [];
  if (meta.respondentId) dupFilters.push({ formId, respondentId: meta.respondentId });
  if (data.sessionToken) dupFilters.push({ formId, sessionToken: data.sessionToken });
  if (dupFilters.length > 0 && (await FormResponse.findOne({ $or: dupFilters }))) {
    throw new ApiError(403, "You have already submitted a response to this form");
  }

  // Grade the quiz + snapshot titles. The total covers every question on the respondent's
  // path (not just the ones they answered) so skipping or timing out can't inflate a percentage.
  let score = 0;
  let totalPoints = 0;
  if (form.isQuiz) {
    const onPath = new Map<string, any>(linearlyReachableQuestions(form).map((q) => [q._id.toString(), q]));
    for (const a of data.answers) if (questionsById.has(a.questionId)) onPath.set(a.questionId, questionsById.get(a.questionId));
    for (const q of onPath.values()) totalPoints += pointsOf(q);
  }
  const respondentName = meta.userName || data.respondentName?.trim() || undefined;
  const answers = data.answers.map((a) => {
    const q = questionsById.get(a.questionId);
    const base: any = { ...a, questionTitleSnapshot: q?.title };
    if (form.isQuiz && q) {
      const graded = gradeAnswer(q, a);
      base.isCorrect = graded.isCorrect;
      base.pointsEarned = graded.pointsEarned;
      score += graded.pointsEarned;
    }
    return base;
  });

  const paymentQuestionAnswer = data.answers.find((a) => {
    const q = questionsById.get(a.questionId);
    return q?.payment?.enabled && !a.skipped;
  });
  const paymentQuestion = paymentQuestionAnswer ? questionsById.get(paymentQuestionAnswer.questionId) : undefined;
  if (paymentQuestionAnswer && paymentQuestion?.payment) {
    const count = paymentQuestionAnswer.selectedOptionIds?.length ?? 0;
    const uniqueOptionIds = new Set(paymentQuestionAnswer.selectedOptionIds ?? []);
    if (uniqueOptionIds.size !== count) throw new ApiError(400, "Duplicate payment options are not allowed");
    const { minSelections, maxSelections } = paymentQuestion.payment;
    if (minSelections != null && count < minSelections) throw new ApiError(400, `Select at least ${minSelections} option(s) for "${paymentQuestion.title}"`);
    if (maxSelections != null && count > maxSelections) throw new ApiError(400, `Select at most ${maxSelections} option(s) for "${paymentQuestion.title}"`);
    const unknown = (paymentQuestionAnswer.selectedOptionIds ?? []).some(
      (id) => !(paymentQuestion.options ?? []).some((option: any) => String(option._id) === id)
    );
    if (unknown) throw new ApiError(400, "Invalid payment option selection");
  }

  // Pre-generate the id so the payment note can reference it in a single write.
  const responseId = new mongoose.Types.ObjectId();
  const paymentSnapshot = paymentQuestionAnswer && paymentQuestion
    ? calculatePayment(paymentQuestion, paymentQuestionAnswer.selectedOptionIds ?? [], responseId.toString(), respondentName)
    : null;
  await consume(form.creatorId, "responses", "respondent");
  const submittedAt = new Date();
  let response: any;
  try {
    response = await FormResponse.create({
      _id: responseId,
      formId,
      respondentId: meta.respondentId,
      sessionToken: data.sessionToken,
      respondentEmail: data.respondentEmail,
      ...(!meta.respondentId && respondentName ? { respondentName } : {}),
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
      answers,
      ...(paymentSnapshot ? { payment: paymentSnapshot } : {}),
      isComplete: data.isComplete,
      submittedAt,
      ...(form.isQuiz ? { score, totalPoints } : {}),
      ...(clock ? { startedAt: clock.startedAt, timeTakenMs: timeTaken(clock, submittedAt) } : {}),
    });
  } catch (err: any) {
    await refund(form.creatorId, "responses");
    if (err?.code === 11000) throw new ApiError(403, "You have already submitted a response to this form");
    throw err;
  }

  // Atomic denormalized counters.
  await Form.updateOne({ _id: formId }, { $inc: { totalResponses: 1 } });
  for (const a of data.answers) {
    if (a.skipped || !a.selectedOptionIds?.length) continue;
    for (const optId of [...new Set(a.selectedOptionIds.map(String))]) {
      await Form.updateOne(
        { _id: formId },
        { $inc: { "sections.$[].questions.$[q].options.$[o].responseCount": 1 } },
        {
          arrayFilters: [
            { "q._id": new mongoose.Types.ObjectId(a.questionId) },
            { "o._id": new mongoose.Types.ObjectId(optId) },
          ],
        }
      );
    }
  }

  const updated = await Form.findById(formId).select("totalResponses");
  emitFormAnalyticsUpdate(formId, { formId, totalResponses: updated?.totalResponses ?? 0 });

  const result: any = { _id: response._id, isComplete: response.isComplete };
  if (form.isQuiz && form.settings?.releaseScoreImmediately) {
    result.score = score;
    result.totalPoints = totalPoints;
  }
  // Server-computed amount is the source of truth for the post-submit pay screen.
  if (paymentSnapshot && paymentSnapshot.totalAmount > 0) {
    const { totalAmount, selectedOptions, message, upiId } = paymentSnapshot;
    result.payment = { totalAmount, selectedOptions, message, upiId };
  }

  // Signed-in account email, else the address typed on a "collect email" form.
  void sendSubmissionCopy(
    meta.respondentId ? meta.userEmail : data.respondentEmail,
    buildFormReceipt(form, { answers: data.answers, score, totalPoints, payment: paymentSnapshot }, respondentName),
    { model: FormResponse, id: response._id },
    "auto"
  );
  return result;
}

export async function getUserResponseHistory(userId: string) {
  return await FormResponse.find({ respondentId: userId })
    .populate({ path: "formId", select: "title status shareToken isQuiz", match: { isDeleted: false } })
    .sort({ submittedAt: -1 });
}
