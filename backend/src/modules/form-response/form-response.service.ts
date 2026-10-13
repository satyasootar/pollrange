import { FormResponse } from "./form-response.model.js";
import { Form } from "../form/form.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { emitFormAnalyticsUpdate } from "../../socket/index.js";
import { GRADABLE_TYPES } from "../form/form.validation.js";
import type { ISubmitFormResponse, ISubmitAnswer } from "./form-response.validation.js";
import mongoose from "mongoose";
import { calculatePayment } from "../form/payment.util.js";
import { consume, refund } from "../billing/billing.service.js";
import { formatFormAnswer } from "../form-analytics/form-analytics.service.js";
import { sendSubmissionCopy } from "../../utils/receipt.js";
import config from "../../config/config.js";

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

  if (form.expiresAt && form.expiresAt < new Date()) {
    form.status = "closed";
    form.closedAt = new Date();
    await form.save();
    throw new ApiError(410, "This form has expired");
  }

  if (form.responseMode === "authenticated" && !meta.respondentId) {
    throw new ApiError(401, "Authentication is required to submit this form");
  }

  if (form.settings?.collectEmail && !meta.respondentId && !data.respondentEmail) {
    throw new ApiError(400, "This form requires your email address");
  }

  const questionsById = new Map<string, any>(allQuestions(form).map((q) => [q._id.toString(), q]));
  const answersById = new Map<string, ISubmitAnswer>(data.answers.map((a) => [a.questionId, a]));

  // Required-question enforcement over linearly-reachable sections.
  for (const q of linearlyReachableQuestions(form)) {
    if (!q.isRequired) continue;
    const a = answersById.get(q._id.toString());
    if (!a || !hasValue(a)) {
      throw new ApiError(400, `A required question was not answered: "${q.title}"`);
    }
  }

  // Per-answer validation rules.
  for (const a of data.answers) {
    const q = questionsById.get(a.questionId);
    if (q && !a.skipped) enforceValidation(q, a);
  }

  // Dedup pre-check (unique indexes are the race-safe backstop below).
  const dupFilters: any[] = [];
  if (meta.respondentId) dupFilters.push({ formId, respondentId: meta.respondentId });
  if (data.sessionToken) dupFilters.push({ formId, sessionToken: data.sessionToken });
  if (dupFilters.length > 0 && (await FormResponse.findOne({ $or: dupFilters }))) {
    throw new ApiError(403, "You have already submitted a response to this form");
  }

  // Grade the quiz + snapshot titles.
  let score = 0;
  let totalPoints = 0;
  const answers = data.answers.map((a) => {
    const q = questionsById.get(a.questionId);
    const base: any = { ...a, questionTitleSnapshot: q?.title };
    if (form.isQuiz && q) {
      totalPoints += q.points ?? 0;
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
    ? calculatePayment(paymentQuestion, paymentQuestionAnswer.selectedOptionIds ?? [], responseId.toString(), meta.userName)
    : null;
  await consume(form.creatorId, "responses", "respondent");
  let response: any;
  try {
    response = await FormResponse.create({
      _id: responseId,
      formId,
      respondentId: meta.respondentId,
      sessionToken: data.sessionToken,
      respondentEmail: data.respondentEmail,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
      answers,
      ...(paymentSnapshot ? { payment: paymentSnapshot } : {}),
      isComplete: data.isComplete,
      submittedAt: new Date(),
      ...(form.isQuiz ? { score, totalPoints } : {}),
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
  const copyTo = meta.respondentId ? meta.userEmail : data.respondentEmail;
  if (copyTo) {
    const notes: string[] = [];
    if (result.score != null) notes.push(`Score: ${result.score}/${result.totalPoints}`);
    if (result.payment) notes.push(`Amount due: ₹${result.payment.totalAmount.toFixed(2)}`);
    sendSubmissionCopy(
      copyTo,
      {
        kind: "form",
        title: form.title,
        url: `${config.CLIENT_URL}/f/${form.shareToken}`,
        name: meta.userName,
        notes,
        // Only questions the respondent actually reached (branching can skip sections).
        rows: allQuestions(form)
          .filter((q) => answersById.has(q._id.toString()))
          .map((q) => ({ question: q.title, answer: formatFormAnswer(q, answersById.get(q._id.toString())) })),
      },
      `receipt-${response._id}`
    );
  }
  return result;
}

export async function getUserResponseHistory(userId: string) {
  return await FormResponse.find({ respondentId: userId })
    .populate({ path: "formId", select: "title status shareToken isQuiz", match: { isDeleted: false } })
    .sort({ submittedAt: -1 });
}
