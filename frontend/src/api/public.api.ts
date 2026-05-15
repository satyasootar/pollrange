import api from "@/lib/api";
import type { PublicPoll, SubmitResponsePayload } from "@/types";

export const publicApi = {
  getPoll: (shareToken: string) =>
    api.get<{ data: PublicPoll }>(`/public/polls/${shareToken}`),

  getResults: (shareToken: string) =>
    api.get<{ data: PublicPoll }>(`/public/polls/${shareToken}/results`),

  submitResponse: (pollId: string, payload: SubmitResponsePayload) =>
    api.post<{
      data: { responseId: string; message: string; totalResponses: number };
    }>(`/responses/${pollId}`, payload),

  checkStatus: (shareToken: string) =>
    api.get<{ data: { status: string; alreadyResponded: boolean } }>(
      `/public/polls/${shareToken}/status`
    ),
};
