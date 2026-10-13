import { useQuery } from "@tanstack/react-query";
import { formAnalyticsApi } from "@/api/form-analytics.api";
import type { ReceiptFilter, TimelineGranularity } from "@/types";

export const formAnalyticsKeys = {
  summary: (id: string) => ["form-analytics", "summary", id] as const,
  timeline: (id: string, groupBy: TimelineGranularity) =>
    ["form-analytics", "timeline", id, groupBy] as const,
  questions: (id: string) => ["form-analytics", "questions", id] as const,
  responses: (id: string, page: number, limit: number, receipt?: ReceiptFilter) =>
    ["form-analytics", "responses", id, page, limit, receipt ?? "all"] as const,
};

export function useFormSummary(formId: string) {
  return useQuery({
    queryKey: formAnalyticsKeys.summary(formId),
    queryFn: () => formAnalyticsApi.summary(formId),
    select: (res) => res.data.data,
    enabled: !!formId,
  });
}

export function useFormTimeline(formId: string, groupBy: TimelineGranularity = "day") {
  return useQuery({
    queryKey: formAnalyticsKeys.timeline(formId, groupBy),
    queryFn: () => formAnalyticsApi.timeline(formId, groupBy),
    select: (res) => res.data.data,
    enabled: !!formId,
  });
}

export function useFormQuestionSummaries(formId: string) {
  return useQuery({
    queryKey: formAnalyticsKeys.questions(formId),
    queryFn: () => formAnalyticsApi.questions(formId),
    select: (res) => res.data.data,
    enabled: !!formId,
  });
}

export function useFormResponses(formId: string, page = 1, limit = 20, receipt?: ReceiptFilter) {
  return useQuery({
    queryKey: formAnalyticsKeys.responses(formId, page, limit, receipt),
    queryFn: () => formAnalyticsApi.responses(formId, page, limit, receipt),
    select: (res) => res.data.data,
    enabled: !!formId,
  });
}
