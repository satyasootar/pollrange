import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";
import { useSendChat } from "@/hooks/use-ai";
import { getApiErrorMessage } from "@/lib/utils";
import { ChatMessages } from "./chat-messages";
import { ChatComposer } from "./chat-composer";
import type { AiAction, AiChatMessage } from "@/types";

/**
 * Right-side AI panel for the poll/form builders. Drives the live builder via
 * `onActions` (add question / set meta). Stateless: it keeps the message history
 * locally and sends it (plus a builder summary) on every turn.
 */
export function BuilderChatPanel({
  surface,
  getBuilderState,
  onActions,
  suggestions,
  onClose,
}: {
  surface: "poll-builder" | "form-builder";
  getBuilderState: () => { title?: string; questions?: string[] };
  onActions: (actions: AiAction[]) => void;
  suggestions?: string[];
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const send = useSendChat();
  const kind = surface === "poll-builder" ? "poll" : "form";

  const handleSend = (text: string) => {
    const next: AiChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    send.mutate(
      { surface, messages: next, builderState: getBuilderState() },
      {
        onSuccess: (res) => {
          const { reply, actions } = res.data.data;
          setMessages((prev) => [...prev, { role: "assistant", content: reply, actions }]);
          if (actions?.length) onActions(actions);
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err));
          setMessages((prev) => prev.slice(0, -1)); // roll back the optimistic user msg
        },
      }
    );
  };

  const defaultSuggestions =
    surface === "poll-builder"
      ? ["Ask the user's name", "Add a single-choice satisfaction question", "Add an open-ended feedback question"]
      : ["Add a question asking the user's name", "Add a 1-5 rating question", "Add a multiple-choice question"];

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-20 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close AI assistant" className="border border-border p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <ChatMessages
        messages={messages}
        pending={send.isPending}
        emptyHint={
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-3">Ask me to build your {kind}, one question at a time.</p>
            <div className="space-y-1.5">
              {(suggestions ?? defaultSuggestions).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSend(s)}
                  className="block w-full border border-border bg-card px-3 py-2 text-left text-xs hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        }
      />
      <ChatComposer onSend={handleSend} disabled={send.isPending} placeholder="Tell the AI what to add…" />
    </div>
  );
}
