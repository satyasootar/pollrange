import api from "@/lib/api";
import type { FullAnalytics, WordCloudItem, TimelinePoint, RespondentEntry, TimelineGranularity, ReceiptInfo } from "@/types";

export const analyticsApi = {
  getSnapshot: (pollId: string) =>
    api.get<{ data: { totalResponses: number; completionRate: number } }>(
      `/analytics/${pollId}/snapshot`
    ),

  getFull: (pollId: string) =>
    api.get<{ data: FullAnalytics }>(`/analytics/${pollId}/full`),

  getRespondents: (pollId: string) =>
    api.get<{ data: RespondentEntry[] }>(`/analytics/${pollId}/respondents`),

  sendReceipt: (pollId: string, responseId: string) =>
    api.post<{ data: ReceiptInfo }>(`/analytics/${pollId}/respondents/${responseId}/receipt`),

  getSummary: (pollId: string) =>
    api.get<{ data: { totalResponses: number; completionRate: number; status: string } }>(
      `/analytics/${pollId}/summary`
    ),

  getTimeline: (pollId: string, groupBy: TimelineGranularity = "day") =>
    api.get<{ data: TimelinePoint[] }>(`/analytics/${pollId}/timeline`, {
      params: { groupBy },
    }),

  getWordCloud: (pollId: string, questionId: string) =>
    api.get<{ data: WordCloudItem[] }>(
      `/analytics/${pollId}/wordcloud/${questionId}`
    ),

  exportData: (pollId: string, format: "csv" | "json") =>
    api.get(`/analytics/${pollId}/export`, {
      params: { format },
      responseType: "blob",
    }),
};
