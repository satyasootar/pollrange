import { api } from "@/lib/api";
import type { ApiResponse, Poll } from "@/types";

export interface ResponseHistoryItem {
  _id: string;
  pollId: {
    _id: string;
    title: string;
    status: "draft" | "active" | "closed" | "published";
    shareToken: string;
  };
  submittedAt: string;
}

export const responsesApi = {
  getUserHistory: () =>
    api.get<ApiResponse<ResponseHistoryItem[]>>("/responses/history"),
};
