import { useState } from "react";
import { Check, Copy, ExternalLink, BarChart3, FileText } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import type { AiCreatedAction } from "@/types";

export function CreatedLinkCard({ action }: { action: AiCreatedAction }) {
  const [copied, setCopied] = useState(false);
  const Icon = action.entity === "poll" ? BarChart3 : FileText;
  const copy = async () => {
    await copyToClipboard(action.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mt-2 border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Icon className="h-3.5 w-3.5" /> {action.entity} created
      </div>
      <p className="mb-2 text-sm font-medium">{action.title}</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={action.url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 border border-border bg-background px-2 py-1 text-xs"
        />
        <button type="button" onClick={copy} title="Copy link" className="shrink-0 border border-border p-1.5 hover:bg-muted">
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
        <a href={action.url} target="_blank" rel="noreferrer" title="Open" className="shrink-0 border border-border p-1.5 hover:bg-muted">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
