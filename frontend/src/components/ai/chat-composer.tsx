import { useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatComposer({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };
  return (
    <div className="flex min-h-20 items-center gap-2 border-t border-border px-4 py-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        placeholder={placeholder ?? "Message Kollects AI…"}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        className="max-h-32 min-h-[38px] flex-1 resize-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <button
        type="button"
        onClick={send}
        disabled={disabled || !text.trim()}
        className={cn(
          "flex h-[38px] w-[38px] shrink-0 items-center justify-center border border-border bg-primary text-primary-foreground transition-opacity",
          (disabled || !text.trim()) && "opacity-50"
        )}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
