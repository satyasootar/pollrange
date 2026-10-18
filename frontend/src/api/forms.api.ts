import api from "@/lib/api";
import { gridLabels } from "@/lib/form-mappers";
import type {
  Form,
  FormFilters,
  FormBuilderForm,
  BuilderFormQuestion,
  PaginationMeta,
} from "@/types";

/** Shape a builder question into the server's order-indexed payload. */
function toQuestionPayload(q: BuilderFormQuestion, order: number) {
  const payload: Record<string, unknown> = {
    _id: q.id,
    order,
    type: q.type,
    title: q.title,
    description: q.description || undefined,
    isRequired: q.isRequired,
  };
  if (q.options.length) {
    payload.options = q.options.map((o, oi) => ({ _id: o.id, text: o.text, order: oi, amount: o.amount }));
  }
  if (q.payment?.enabled) payload.payment = q.payment;
  if (q.optionNavigation) payload.optionNavigation = q.optionNavigation;
  if (q.scaleMin !== undefined) payload.scaleMin = q.scaleMin;
  if (q.scaleMax !== undefined) payload.scaleMax = q.scaleMax;
  if (q.scaleMinLabel) payload.scaleMinLabel = q.scaleMinLabel;
  if (q.scaleMaxLabel) payload.scaleMaxLabel = q.scaleMaxLabel;
  const rows = gridLabels(q.rows);
  const columns = gridLabels(q.columns);
  if (rows) payload.rows = rows;
  if (columns) payload.columns = columns;
  if (q.fileConfig) payload.fileConfig = q.fileConfig;
  if (q.validation) payload.validation = q.validation;
  if (q.points !== undefined) payload.points = q.points;
  if (q.answerKey) payload.answerKey = q.answerKey;
  return payload;
}

/** Shape the builder form into a POST/PATCH /forms payload. */
export function toFormPayload(form: FormBuilderForm) {
  return {
    title: form.title,
    description: form.description || undefined,
    slug: form.slug.trim() || undefined,
    coverImageUrl: form.coverImageUrl || undefined,
    branding: form.branding,
    isQuiz: form.isQuiz,
    responseMode: form.responseMode,
    // datetime-local is wall-clock time in the creator's zone; send an absolute instant.
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    settings: form.settings,
    sections: form.sections.map((s, si) => ({
      _id: s.id,
      order: si,
      title: s.title || undefined,
      description: s.description || undefined,
      navigation: s.navigation,
      questions: s.questions.map((q, qi) => toQuestionPayload(q, qi)),
    })),
  };
}

export const formsApi = {
  list: (filters: FormFilters = {}) =>
    api.get<{ data: { forms: Form[]; pagination: PaginationMeta } }>("/forms", { params: filters }),

  get: (formId: string) => api.get<{ data: Form }>(`/forms/${formId}`),

  create: (form: FormBuilderForm) => api.post<{ data: Form }>("/forms", toFormPayload(form)),

  update: (formId: string, form: FormBuilderForm) =>
    api.patch<{ data: Form }>(`/forms/${formId}`, toFormPayload(form)),

  delete: (formId: string) => api.delete(`/forms/${formId}`),

  duplicate: (formId: string) => api.post<{ data: Form }>(`/forms/${formId}/duplicate`),

  publish: (formId: string, mode: "live" | "permanent" = "permanent") =>
    api.post<{ data: Form }>(`/forms/${formId}/publish`, { mode }),

  close: (formId: string) => api.patch<{ data: Form }>(`/forms/${formId}/close`),

  reopen: (formId: string, expiresAt?: string | null) =>
    api.patch<{ data: Form }>(`/forms/${formId}/reopen`, { expiresAt }),

  regenerateToken: (formId: string) =>
    api.post<{ data: { shareToken: string } }>(`/forms/${formId}/regenerate-token`),

  checkSlug: (slug: string, formId?: string) =>
    api.get<{ data: { slug: string; available: boolean } }>("/forms/slug-availability", {
      params: { slug, ...(formId ? { formId } : {}) },
    }),

  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ data: { url: string } }>(`/forms/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
