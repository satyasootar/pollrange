import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/api/analytics.api";
import type { TimelineGranularity } from "@/types";

export const analyticsKeys = {
  full: (pollId: string) => ["analytics", pollId, "full"] as const,
  summary: (pollId: string) => ["analytics", pollId, "summary"] as const,
  timeline: (pollId: string, groupBy: TimelineGranularity) =>
    ["analytics", pollId, "timeline", groupBy] as const,
  wordCloud: (pollId: string, questionId: string) =>
    ["analytics", pollId, "wordcloud", questionId] as const,
  respondents: (pollId: string) => ["analytics", pollId, "respondents"] as const,
};

export function useFullAnalytics(pollId: string) {
  return useQuery({
    queryKey: analyticsKeys.full(pollId),
    queryFn: () => analyticsApi.getFull(pollId),
    select: (res) => res.data.data,
    enabled: !!pollId,
    staleTime: 0, // Always fresh since we update via socket
    refetchInterval: false,
  });
}

export function useAnalyticsSummary(pollId: string) {
  return useQuery({
    queryKey: analyticsKeys.summary(pollId),
    queryFn: () => analyticsApi.getSummary(pollId),
    select: (res) => res.data.data,
    enabled: !!pollId,
    refetchInterval: 30_000, // fallback polling every 30s if socket drops
  });
}

export function useTimeline(pollId: string, groupBy: TimelineGranularity = "day") {
  return useQuery({
    queryKey: analyticsKeys.timeline(pollId, groupBy),
    queryFn: () => analyticsApi.getTimeline(pollId, groupBy),
    select: (res) => res.data.data,
    enabled: !!pollId,
  });
}

export function useRespondents(pollId: string, enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.respondents(pollId),
    queryFn: () => analyticsApi.getRespondents(pollId),
    select: (res) => res.data.data,
    enabled: !!pollId && enabled,
  });
}

export function useWordCloud(pollId: string, questionId: string) {
  return useQuery({
    queryKey: analyticsKeys.wordCloud(pollId, questionId),
    queryFn: () => analyticsApi.getWordCloud(pollId, questionId),
    select: (res) => res.data.data,
    enabled: !!(pollId && questionId),
  });
}
