import { FormResponse } from "../form-response/form-response.model.js";
import { Form } from "../form/form.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { CHOICE_TYPES, GRID_TYPES } from "../form/form.validation.js";
import { aggregateTimeline, fillSeries, type Granularity } from "../../utils/timeline.js";
import mongoose from "mongoose";

/** Response timeline bucketed by the requested granularity, zero-filled for a continuous chart. */
export async function getFormTimeline(formId: string, groupBy: Granularity) {
  const raw = await aggregateTimeline(FormResponse, "formId", formId, groupBy);
  return fillSeries(raw, groupBy);
}

function flattenQuestions(form: any): any[] {
  return (form.sections ?? []).flatMap((s: any) => s.questions ?? []);
}

/** Summary: totals, timeline, browser breakdown, quiz averages. */
export async function getFormSummary(formId: string) {
  const form = await Form.findById(formId);
  if (!form) throw new ApiError(404, "Form not found");

  const totalResponses = await FormResponse.countDocuments({ formId });
  const completedResponses = await FormResponse.countDocuments({ formId, isComplete: true });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const timelineRaw = await FormResponse.aggregate([
    { $match: { formId: new mongoose.Types.ObjectId(formId), submittedAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const responses = await FormResponse.find({ formId }).select("userAgent");
  const browserStats = { Chrome: 0, Firefox: 0, Safari: 0, Edge: 0, Mobile: 0, Other: 0 };
  responses.forEach((r) => {
    const ua = r.userAgent || "";
    if (ua.includes("Mobi")) browserStats.Mobile++;
    if (ua.includes("Edg")) browserStats.Edge++;
    else if (ua.includes("Chrome")) browserStats.Chrome++;
    else if (ua.includes("Firefox")) browserStats.Firefox++;
    else if (ua.includes("Safari")) browserStats.Safari++;
    else browserStats.Other++;
  });

  let quiz: { averageScore: number; totalPoints: number } | undefined;
  if (form.isQuiz) {
    const graded = await FormResponse.find({ formId }).select("score totalPoints");
    const avg = graded.length ? graded.reduce((a, r) => a + (r.score ?? 0), 0) / graded.length : 0;
    quiz = { averageScore: avg, totalPoints: graded[0]?.totalPoints ?? 0 };
  }

  return {
    formId,
    title: form.title,
    status: form.status,
    isQuiz: form.isQuiz,
    expiresAt: form.expiresAt,
    totalResponses,
    completionRate: totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0,
    timeline: timelineRaw.map((t: any) => ({ date: t._id, count: t.count })),
    browserStats,
    quiz,
  };
}

/** Per-question aggregation, computed on read (choice options use the fast denormalized count). */
export async function getQuestionSummaries(formId: string) {
  const form = await Form.findById(formId);
  if (!form) throw new ApiError(404, "Form not found");

  const responses = await FormResponse.find({ formId }).select("answers");
  const questions = flattenQuestions(form);

  return questions.map((q: any) => {
    const qId = q._id.toString();
    const answers = responses
      .map((r: any) => r.answers.find((a: any) => a.questionId.toString() === qId))
      .filter((a: any) => a && !a.skipped);
    const responseCount = answers.length;

    const base = { questionId: qId, title: q.title, type: q.type, responseCount };

    if (CHOICE_TYPES.includes(q.type)) {
      const options = (q.options ?? []).map((opt: any) => ({
        optionId: opt._id.toString(),
        text: opt.text,
        count: opt.responseCount ?? 0,
      }));
      const total = options.reduce((a: number, o: any) => a + o.count, 0);
      return {
        ...base,
        options: options.map((o: any) => ({ ...o, percentage: total > 0 ? (o.count / total) * 100 : 0 })),
      };
    }

    if (q.type === "linear_scale" || q.type === "rating") {
      const distribution: Record<string, number> = {};
      let sum = 0;
      answers.forEach((a: any) => {
        if (a.scaleValue != null) {
          distribution[a.scaleValue] = (distribution[a.scaleValue] || 0) + 1;
          sum += a.scaleValue;
        }
      });
      return { ...base, scaleMin: q.scaleMin, scaleMax: q.scaleMax, distribution, average: responseCount ? sum / responseCount : 0 };
    }

    if (GRID_TYPES.includes(q.type)) {
      const matrix: Record<string, Record<string, number>> = {};
      (q.rows ?? []).forEach((row: string) => {
        matrix[row] = {};
        (q.columns ?? []).forEach((col: string) => (matrix[row]![col] = 0));
      });
      answers.forEach((a: any) => {
        (a.gridValues ?? []).forEach((gv: any) => {
          const rowCounts = matrix[gv.row];
          if (rowCounts) gv.columns.forEach((col: string) => {
            if (rowCounts[col] != null) rowCounts[col] += 1;
          });
        });
      });
      return { ...base, rows: q.rows, columns: q.columns, matrix };
    }

    if (q.type === "file_upload") {
      const files = answers.flatMap((a: any) => a.fileUrls ?? []);
      return { ...base, files };
    }

    // text / date / time — list of raw values
    const values = answers
      .map((a: any) => a.textValue ?? a.dateValue ?? (a.numberValue != null ? String(a.numberValue) : null))
      .filter(Boolean);
    return { ...base, values };
  });
}

/** Paginated individual responses (owner-only PII — verify ownership in controller). */
export async function getIndividualResponses(formId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const total = await FormResponse.countDocuments({ formId });
  const responses = await FormResponse.find({ formId })
    .populate("respondentId", "name email")
    .sort({ submittedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const items = responses.map((r: any) => ({
    responseId: r._id,
    name: r.respondentId?.name ?? "Anonymous",
    email: r.respondentId?.email ?? r.respondentEmail ?? null,
    submittedAt: r.submittedAt,
    isComplete: r.isComplete,
    score: r.score,
    totalPoints: r.totalPoints,
    payment: r.payment?.totalAmount ? r.payment : undefined,
    answers: r.answers,
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/** Builds a CSV: one row per response, one column per question. */
export async function exportCsv(formId: string): Promise<string> {
  const form = await Form.findById(formId);
  if (!form) throw new ApiError(404, "Form not found");
  const questions = flattenQuestions(form);
  const responses = await FormResponse.find({ formId })
    .populate("respondentId", "name email")
    .sort({ submittedAt: -1 })
    .lean();

  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Submitted At", "Respondent", "Email", ...questions.map((q: any) => q.title)];
  if (form.isQuiz) header.push("Score");
  const hasPayment = questions.some((q: any) => q.payment?.enabled);
  if (hasPayment) header.push("Amount Due (INR)", "Payment Note");

  const optionText = (q: any, id: string) => (q.options ?? []).find((o: any) => o._id.toString() === id)?.text ?? id;
  const cell = (q: any, a: any): string => {
    if (!a || a.skipped) return "";
    if (CHOICE_TYPES.includes(q.type)) return (a.selectedOptionIds ?? []).map((id: string) => optionText(q, id)).join("; ");
    if (GRID_TYPES.includes(q.type)) return (a.gridValues ?? []).map((g: any) => `${g.row}: ${g.columns.join(", ")}`).join(" | ");
    if (q.type === "file_upload") return (a.fileUrls ?? []).map((f: any) => f.url).join("; ");
    if (a.scaleValue != null) return String(a.scaleValue);
    return a.textValue ?? a.dateValue ?? (a.numberValue != null ? String(a.numberValue) : "");
  };

  const rows = [header.map(esc).join(",")];
  for (const r of responses as any[]) {
    const answersById = new Map(r.answers.map((a: any) => [a.questionId.toString(), a]));
    const row = [
      new Date(r.submittedAt).toISOString(),
      r.respondentId?.name ?? "Anonymous",
      r.respondentId?.email ?? r.respondentEmail ?? "",
      ...questions.map((q: any) => cell(q, answersById.get(q._id.toString()))),
    ];
    if (form.isQuiz) row.push(`${r.score ?? 0}/${r.totalPoints ?? 0}`);
    if (hasPayment) row.push(r.payment?.totalAmount ? r.payment.totalAmount.toFixed(2) : "", r.payment?.message ?? "");
    rows.push(row.map(esc).join(","));
  }
  return rows.join("\n");
}
