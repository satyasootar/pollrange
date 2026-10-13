import api from "@/lib/api";
import type {
  FormSummary,
  FormQuestionSummary,
  IndividualFormResponse,
  PaginationMeta,
  ReceiptInfo,
  TimelinePoint,
  TimelineGranularity,
} from "@/types";

export const formAnalyticsApi = {
  summary: (formId: string) =>
    api.get<{ data: FormSummary }>(`/form-analytics/${formId}/summary`),

  timeline: (formId: string, groupBy: TimelineGranularity = "day") =>
    api.get<{ data: TimelinePoint[] }>(`/form-analytics/${formId}/timeline`, {
      params: { groupBy },
    }),

  questions: (formId: string) =>
    api.get<{ data: FormQuestionSummary[] }>(`/form-analytics/${formId}/questions`),

  responses: (formId: string, page = 1, limit = 20) =>
    api.get<{ data: { items: IndividualFormResponse[]; pagination: PaginationMeta } }>(
      `/form-analytics/${formId}/responses`,
      { params: { page, limit } }
    ),

  sendReceipt: (formId: string, responseId: string) =>
    api.post<{ data: ReceiptInfo }>(`/form-analytics/${formId}/responses/${responseId}/receipt`),

  exportCsvUrl: (formId: string) => `/form-analytics/${formId}/export`,

  exportCsv: (formId: string) =>
    api.get(`/form-analytics/${formId}/export`, { responseType: "blob" }),
};
