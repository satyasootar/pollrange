import { useQuery, useMutation } from "@tanstack/react-query";
import { publicApi } from "@/api/public.api";
import { getOrCreateSessionToken, getApiErrorMessage } from "@/lib/utils";
import type { AnswerPayload } from "@/types";
import { toast } from "sonner";

export function usePublicPoll(shareToken: string) {
  return useQuery({
    queryKey: ["public-poll", shareToken],
    queryFn: () => publicApi.getPoll(shareToken),
    select: (res) => res.data.data,
    enabled: !!shareToken,
    staleTime: 1000 * 30,
  });
}

export function usePublishedResults(shareToken: string) {
  return useQuery({
    queryKey: ["poll-results", shareToken],
    queryFn: () => publicApi.getResults(shareToken),
    select: (res) => res.data.data,
    enabled: !!shareToken,
  });
}

export function useSubmitResponse(pollId: string) {
  return useMutation({
    mutationFn: (answers: AnswerPayload[]) => {
      const sessionToken = getOrCreateSessionToken(pollId);
      return publicApi.submitResponse(pollId, { sessionToken, answers });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}
