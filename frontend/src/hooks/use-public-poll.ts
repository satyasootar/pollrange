import { useQuery, useMutation } from "@tanstack/react-query";
import { publicApi } from "@/api/public.api";
import { getOrCreateSessionToken, getApiErrorMessage } from "@/lib/utils";
import type { AnswerPayload } from "@/types";
import { toast } from "sonner";

export function usePublicPoll(shareToken: string) {
  return useQuery({
    queryKey: ["public-poll", shareToken],
    queryFn: () => {
        // We use a dummy pollId to get/create token if we don't have it yet, 
        // but typically the session token is unique per browser or per poll.
        // For status check, any valid token will do to check against previous responses.
        const sessionToken = getOrCreateSessionToken(shareToken);
        return publicApi.getPoll(shareToken, sessionToken);
    },
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
      return publicApi.submitResponse(pollId, { 
        sessionToken, 
        answers,
        isComplete: true 
      });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function usePollStatus(shareToken: string) {
  return useQuery({
    queryKey: ["poll-status", shareToken],
    queryFn: () => {
        const sessionToken = getOrCreateSessionToken(shareToken);
        return publicApi.checkStatus(shareToken, sessionToken);
    },
    select: (res) => res.data.data,
    enabled: !!shareToken,
    refetchInterval: 1000 * 60, // Refresh status every minute
  });
}
