import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/api/ai.api";

export const aiKeys = {
  conversations: ["ai", "conversations"] as const,
  conversation: (id: string) => ["ai", "conversation", id] as const,
};

export function useSendChat() {
  return useMutation({ mutationFn: aiApi.chat });
}

export function useConversations() {
  return useQuery({
    queryKey: aiKeys.conversations,
    queryFn: aiApi.listConversations,
    select: (r) => r.data.data,
  });
}

export function useConversation(id?: string) {
  return useQuery({
    queryKey: id ? aiKeys.conversation(id) : ["ai", "conversation", "none"],
    queryFn: () => aiApi.getConversation(id!),
    select: (r) => r.data.data,
    enabled: !!id,
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aiApi.deleteConversation,
    onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.conversations }),
  });
}
