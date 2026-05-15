import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { pollsApi } from "@/api/polls.api";
import type { PollFilters, PollBuilderForm } from "@/types";
import { getApiErrorMessage, buildShareUrl } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (form: PollBuilderForm) => pollsApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pollKeys.all });
      toast.success("Poll created successfully!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
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
    onError: (err) => toast.error(getApiErrorMessage(err)),
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
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function usePublishPoll(pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pollsApi.publish(pollId),
    onSuccess: (res) => {
      const poll = res.data.data;
      qc.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
      qc.invalidateQueries({ queryKey: pollKeys.all });
      toast.success("Results published!", {
        description: `Public link: ${buildShareUrl(poll.shareToken)}/results`,
      });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useClosePoll(pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pollsApi.close(pollId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
      toast.success("Poll closed.");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}
