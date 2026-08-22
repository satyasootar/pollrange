import api from "@/lib/api";
import type {
  AiChatMessage,
  AiChatResponse,
  AiConversationDetail,
  AiConversationListItem,
  AiSurface,
} from "@/types";

export interface AiChatBody {
  surface: AiSurface;
  conversationId?: string;
  message?: string;
  messages?: AiChatMessage[];
  builderState?: { title?: string; questions?: string[] };
}

export const aiApi = {
  chat: (body: AiChatBody) => api.post<{ data: AiChatResponse }>("/ai/chat", body),
  listConversations: () => api.get<{ data: AiConversationListItem[] }>("/ai/conversations"),
  getConversation: (id: string) => api.get<{ data: AiConversationDetail }>(`/ai/conversations/${id}`),
  deleteConversation: (id: string) => api.delete(`/ai/conversations/${id}`),
};
