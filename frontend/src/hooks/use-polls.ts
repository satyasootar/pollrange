import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { track } from "@/lib/tracker";
import { pollsApi } from "@/api/polls.api";
import type { PollFilters, PollBuilderForm } from "@/types";
import { buildShareUrl, toastApiError } from "@/lib/utils";
import { toast } from "sonner";

export const pollKeys = {
  all: ["polls"] as const,
  list: (filters: PollFilters) => ["polls", "list", filters] as const,
  detail: (id: string) => ["polls", "detail", id] as const,
};

export function usePolls(filters: PollFilters = {}) {
  return useQuery({
    queryKey: pollKeys.list(filters),
    queryFn: () => pollsApi.list(filters),
    select: (res) => res.data.data,
    placeholderData: keepPreviousData,
  });
}

export function usePoll(pollId: string) {
  return useQuery({
    queryKey: pollKeys.detail(pollId),
    queryFn: () => pollsApi.get(pollId),
    select: (res) => res.data.data,
    enabled: !!pollId,
  });
}

export function useCreatePoll() {
  const qc = useQueryClient();

  // No hook-level onError: the review step needs to distinguish validation
  // errors (show a fix-and-retry dialog) from generic failures (toast) itself.
  return useMutation({
    mutationFn: (form: PollBuilderForm) => pollsApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pollKeys.all });
      track("poll_created");
      toast.success("Poll created successfully!");
    },
  });
}

export function useUpdatePoll(pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: Partial<PollBuilderForm>) => pollsApi.update(pollId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
      qc.invalidateQueries({ queryKey: pollKeys.all });
      toast.success("Poll updated.");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useDeletePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => pollsApi.delete(pollId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pollKeys.all });
      toast.success("Poll deleted.");
    },
    onError: (err) => toastApiError(err),
  });
}

export function usePublishPoll(pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: "live" | "permanent" = "permanent") => pollsApi.publish(pollId, mode),
    onSuccess: (res) => {
      const poll = res.data.data;
      qc.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
      qc.invalidateQueries({ queryKey: pollKeys.all });
      toast.success("Results published!", {
        description: `Public link: ${buildShareUrl(poll.shareToken)}/results`,
      });
    },
    onError: (err) => toastApiError(err),
  });
}

export function useClosePoll(pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pollsApi.close(pollId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
      qc.invalidateQueries({ queryKey: pollKeys.all });
      toast.success("Poll closed.");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useReopenPoll(pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expiresAt?: string | null) => pollsApi.reopen(pollId, expiresAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
      qc.invalidateQueries({ queryKey: pollKeys.all });
      toast.success("Poll reopened!");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useRegenerateToken(pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pollsApi.regenerateToken(pollId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
      qc.invalidateQueries({ queryKey: pollKeys.all });
      toast.success("New share link generated.");
    },
    onError: (err) => toastApiError(err),
  });
}
