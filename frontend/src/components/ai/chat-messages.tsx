import { useEffect, useRef, type ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { AiChatMessage, AiCreatedAction } from "@/types";
import { CreatedLinkCard } from "./created-link-card";

// Theme-matched markdown (raw HTML is not rendered by react-markdown → XSS-safe).
const MD_CLASS =
  "space-y-2 leading-relaxed [&_p]:my-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:my-0.5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_h1]:font-semibold " +
  "[&_h2]:font-semibold [&_h3]:font-semibold [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs " +
  "[&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0";

export function ChatMessages({
  messages,
  pending,
  emptyHint,
}: {
  messages: AiChatMessage[];
  pending?: boolean;
  emptyHint?: ReactNode;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages.length, pending]);

  if (messages.length === 0 && !pending) {
    return <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">{emptyHint}</div>;
  }

  return (
    <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
      {messages.map((m, i) => (
        <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[85%] border p-3 text-sm",
              m.role === "user" ? "border-primary/30 bg-primary/10" : "border-border bg-card"
            )}
          >
            {m.role === "assistant" && (
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Kollects AI
              </div>
            )}
            {m.content &&
              (m.role === "assistant" ? (
                <div className={MD_CLASS}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              ))}
            {m.actions
              ?.filter((a) => a.kind === "created")
              .map((a, ai) => <CreatedLinkCard key={ai} action={a as AiCreatedAction} />)}
          </div>
        </div>
      ))}
      {pending && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 border border-border bg-card p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
