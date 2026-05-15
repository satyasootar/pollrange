import api from "@/lib/api";
import type { Poll, PollFilters, PollBuilderForm, PaginationMeta } from "@/types";

/** Shape the builder form into a POST /polls payload */
function toCreatePayload(form: PollBuilderForm) {
  return {
    title: form.title,
    description: form.description || undefined,
    expiresAt: form.expiresAt,
    responseMode: form.responseMode,
    settings: form.settings,
    questions: form.questions.map((q, qi) => ({
      text: q.text,
      type: q.type,
      isMandatory: q.isMandatory,
      order: qi,
      options: q.options.map((o, oi) => ({ text: o.text, order: oi })),
    })),
  };
}

export const pollsApi = {
  list: (filters: PollFilters = {}) =>
    api.get<{ data: { polls: Poll[]; pagination: PaginationMeta } }>("/polls", {
      params: filters,
    }),

  get: (pollId: string) =>
    api.get<{ data: Poll }>(`/polls/${pollId}`),

  create: (form: PollBuilderForm) =>
    api.post<{ data: { poll: Poll; shareLink: string } }>("/polls", toCreatePayload(form)),

  update: (pollId: string, form: Partial<PollBuilderForm>) =>
    api.patch<{ data: Poll }>(`/polls/${pollId}`, toCreatePayload(form as PollBuilderForm)),

  delete: (pollId: string) =>
    api.delete(`/polls/${pollId}`),

  publish: (pollId: string) =>
    api.post<{ data: Poll }>(`/polls/${pollId}/publish`),

  close: (pollId: string) =>
    api.patch<{ data: Poll }>(`/polls/${pollId}/close`),

  reopen: (pollId: string) =>
    api.patch<{ data: Poll }>(`/polls/${pollId}/reopen`),

  regenerateToken: (pollId: string) =>
    api.post<{ data: { shareToken: string } }>(`/polls/${pollId}/regenerate-token`),
};
