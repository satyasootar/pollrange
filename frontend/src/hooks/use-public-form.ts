import { useQuery, useMutation } from "@tanstack/react-query";
import { formPublicApi } from "@/api/form-public.api";
import type { SubmitFormResponsePayload } from "@/types";

export function usePublicForm(shareToken: string, sessionToken?: string) {
  return useQuery({
    queryKey: ["public-form", shareToken],
    queryFn: () => formPublicApi.get(shareToken, sessionToken),
    select: (res) => res.data.data,
    enabled: !!shareToken,
    retry: false,
    // Never swap the form out mid-attempt (e.g. a quiz past its deadline before the timer flushes answers).
    refetchOnWindowFocus: false,
  });
}

export function useSubmitFormResponse(formId: string) {
  return useMutation({
    mutationFn: (payload: SubmitFormResponsePayload) => formPublicApi.submit(formId, payload),
    // Error toast handled at the call site so guard screens can react to the status.
  });
}

/** Until results are published, re-check on this interval so the leaderboard appears without a reload. */
const RESULTS_POLL_MS = 10_000;

export function useQuizResults(shareToken: string, sessionToken: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["quiz-results", shareToken, sessionToken],
    queryFn: () => formPublicApi.results(shareToken, sessionToken),
    select: (res) => res.data.data,
    enabled: !!shareToken && enabled,
    retry: false,
    refetchInterval: (query) => (query.state.data?.data.data.resultsPublished ? false : RESULTS_POLL_MS),
  });
}
