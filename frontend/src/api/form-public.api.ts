import api from "@/lib/api";
import type { PublicForm, SubmitFormResponsePayload, SubmitFormResult, FormFileValue, QuizResults, QuizLeaderboardPage } from "@/types";

export const formPublicApi = {
  get: (shareToken: string, sessionToken?: string) =>
    api.get<{ data: PublicForm }>(`/public/forms/${shareToken}`, {
      params: sessionToken ? { sessionToken } : {},
    }),

  status: (shareToken: string, sessionToken?: string) =>
    api.get<{ data: { status: string; isExpired: boolean; alreadyResponded: boolean } }>(
      `/public/forms/${shareToken}/status`,
      { params: sessionToken ? { sessionToken } : {} }
    ),

  results: (shareToken: string, sessionToken?: string) =>
    api.get<{ data: QuizResults }>(`/public/forms/${shareToken}/results`, {
      params: sessionToken ? { sessionToken } : {},
    }),

  leaderboard: (shareToken: string, offset: number, limit: number, sessionToken?: string) =>
    api.get<{ data: QuizLeaderboardPage }>(`/public/forms/${shareToken}/leaderboard`, {
      params: { offset, limit, ...(sessionToken ? { sessionToken } : {}) },
    }),

  /** Per-person timer: start (or resume) this taker's attempt. */
  startAttempt: (formId: string, sessionToken: string) =>
    api.post<{ data: { startedAt: string; endsAt: string | null; serverTime: string } }>(`/form-responses/${formId}/attempt`, { sessionToken }),

  submit: (formId: string, payload: SubmitFormResponsePayload) =>
    api.post<{ data: SubmitFormResult }>(`/form-responses/${formId}`, payload),

  uploadFile: (formId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ data: FormFileValue }>(`/form-responses/${formId}/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
