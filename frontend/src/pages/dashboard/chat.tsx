import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2, MessageSquare, PanelRight, X } from "lucide-react";
import { aiApi } from "@/api/ai.api";
import { aiKeys, useConversations, useDeleteConversation, useSendChat } from "@/hooks/use-ai";
import { ChatMessages } from "@/components/ai/chat-messages";
import { ChatComposer } from "@/components/ai/chat-composer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, getApiErrorMessage } from "@/lib/utils";
import type { AiChatMessage, AiConversationListItem } from "@/types";

const SUGGESTIONS = [
  "Create a 3-question customer feedback poll",
  "Make a job application form with a resume upload",
  "Build a 5-question JavaScript quiz",
];

export function ChatPage() {
  const qc = useQueryClient();
  const { data: conversations } = useConversations();
  const del = useDeleteConversation();
  const send = useSendChat();

  const [activeId, setActiveId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<AiConversationListItem | null>(null);

  const newChat = () => {
    setActiveId(undefined);
    setMessages([]);
  };

  const openConversation = async (id: string) => {
    try {
      const res = await aiApi.getConversation(id);
      setActiveId(id);
      setMessages(res.data.data.messages ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    send.mutate(
      { surface: "dashboard", conversationId: activeId, message: text },
      {
        onSuccess: (res) => {
          const { conversationId, reply, actions } = res.data.data;
          if (conversationId && !activeId) setActiveId(conversationId);
          setMessages((prev) => [...prev, { role: "assistant", content: reply, actions }]);
          qc.invalidateQueries({ queryKey: aiKeys.conversations });
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err));
          setMessages((prev) => prev.slice(0, -1));
        },
      }
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const id = pendingDelete._id;
    del.mutate(id, {
      onSuccess: () => {
        if (id === activeId) newChat();
        setPendingDelete(null);
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {/* Active chat */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-20 shrink-0 items-center justify-between gap-2 border-b border-border px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h1 className="text-sm font-semibold">AI Assistant</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={newChat}
              className="flex items-center gap-1 border border-border px-2.5 py-1.5 text-xs hover:border-primary/40"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              title="Toggle chat history"
              aria-label="Toggle chat history"
              className={cn(
                "border border-border p-1.5",
                historyOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <ChatMessages
          messages={messages}
          pending={send.isPending}
          emptyHint={
            <div className="max-w-md text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h2 className="mb-1 text-lg font-semibold">Create with AI</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Describe what you want. I'll build the poll or form and give you the link, right here.
              </p>
              <div className="space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="block w-full border border-border bg-card px-3 py-2 text-left text-sm hover:border-primary/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          }
        />
        <ChatComposer onSend={handleSend} disabled={send.isPending} placeholder="Ask AI to create a poll or form…" />
      </div>

      {/* Conversation history — right side, collapsible */}
      {historyOpen && (
        <aside className="hidden w-72 shrink-0 flex-col border-l border-border md:flex">
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold">Chats</span>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              title="Close history"
              aria-label="Close history"
              className="border border-border p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
            {(conversations ?? []).map((c) => (
              <div
                key={c._id}
                onClick={() => openConversation(c._id)}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 border px-3 py-2 text-sm transition-colors",
                  c._id === activeId
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-transparent hover:border-border hover:bg-muted"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{c.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(c);
                  }}
                  className="shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {conversations?.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">No chats yet.</p>}
          </div>
        </aside>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              This permanently deletes “{pendingDelete?.title}” and all of its messages. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={del.isPending}>
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
