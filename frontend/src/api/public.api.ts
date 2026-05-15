import api from "@/lib/api";
import type { PublicPoll, SubmitResponsePayload } from "@/types";

export const publicApi = {
  getPoll: (shareToken: string, sessionToken?: string) =>
    api.get<{ data: PublicPoll }>(`/public/polls/${shareToken}`, {
      params: { sessionToken },
    }),

  getResults: (shareToken: string) =>
    api.get<{ data: PublicPoll }>(`/public/polls/${shareToken}/results`),

  submitResponse: (pollId: string, payload: SubmitResponsePayload) =>
    api.post<{
      data: { responseId: string; message: string; totalResponses: number };
    }>(`/responses/${pollId}`, payload),

  checkStatus: (shareToken: string, sessionToken?: string) =>
    api.get<{ data: { status: string; alreadyResponded: boolean } }>(
      `/public/polls/${shareToken}/status`,
      { params: { sessionToken } }
    ),
};
