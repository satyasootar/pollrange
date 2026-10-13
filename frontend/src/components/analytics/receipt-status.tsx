import { useState } from "react";
import { Mail, MailCheck, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDatetime } from "@/lib/utils";
import type { ReceiptFilter, ReceiptInfo, ReceiptSummary as Summary } from "@/types";

const LOOK = {
  sent: { label: "Copy sent", short: "sent", Icon: MailCheck, tone: "text-emerald-600" },
  failed: { label: "Email failed", short: "failed", Icon: MailX, tone: "text-destructive" },
  unsent: { label: "Not sent", short: "not sent", Icon: Mail, tone: "text-muted-foreground" },
} as const;

/**
 * Shows whether a respondent got their emailed copy, with a button to send it
 * (again) by hand. Clicking the status opens every attempt with its error.
 * Respondents with no email address just say so.
 */
export function ReceiptStatus({
  receipt,
  history = [],
  email,
  sending,
  onSend,
}: {
  receipt: ReceiptInfo | null;
  history?: ReceiptInfo[];
  email: string | null;
  sending: boolean;
  onSend: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!email && !receipt) return <span className="whitespace-nowrap text-xs text-muted-foreground">No email</span>;

  const { label, Icon, tone } = LOOK[receipt?.status ?? "unsent"];
  const detail = receipt
    ? `${receipt.status === "sent" ? "Sent" : "Failed"} to ${receipt.to} · ${formatDatetime(receipt.at)}${receipt.error ? ` · ${receipt.error}` : ""}`
    : "No copy has been emailed yet";
  // Older responses only have the latest outcome, recorded before history was kept.
  const attempts = history.length ? history : receipt ? [receipt] : [];

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline", tone)}
        title={detail}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
        {attempts.length > 1 && <span className="text-muted-foreground">({attempts.length})</span>}
        <span className="sr-only">. {detail}. Show email history</span>
      </button>
      <Button type="button" variant="outline" size="xs" className="h-7 px-2" disabled={sending} onClick={onSend}>
        {sending ? "Sending…" : receipt?.status === "sent" ? "Resend" : "Send copy"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email history</DialogTitle>
            <DialogDescription>Every attempt to email this respondent a copy of their answers{email ? ` (${email})` : ""}.</DialogDescription>
          </DialogHeader>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No copy has been emailed yet.</p>
          ) : (
            <ol className="max-h-80 divide-y divide-border overflow-y-auto border border-border">
              {[...attempts].reverse().map((a, i) => {
                const look = LOOK[a.status];
                return (
                  <li key={i} className="space-y-0.5 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("inline-flex items-center gap-1 font-medium", look.tone)}>
                        <look.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {look.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDatetime(a.at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      To {a.to} · {a.trigger === "manual" ? "sent by you" : "sent automatically on submit"}
                    </p>
                    {a.error && <p className="wrap-break-word text-xs text-destructive">{a.error}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </span>
  );
}

/** "N sent · N failed · N not sent" counts that double as a filter. */
export function ReceiptSummary({
  summary,
  filter,
  onFilter,
}: {
  summary: Summary;
  filter: ReceiptFilter | undefined;
  onFilter: (f: ReceiptFilter | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" role="group" aria-label="Filter by emailed copy">
      <span className="font-medium text-muted-foreground">Emailed copies:</span>
      {(Object.keys(LOOK) as ReceiptFilter[]).map((k) => {
        const { short, Icon, tone } = LOOK[k];
        const active = filter === k;
        return (
          <button
            key={k}
            type="button"
            aria-pressed={active}
            onClick={() => onFilter(active ? undefined : k)}
            className={cn(
              "inline-flex items-center gap-1 border px-2 py-1 transition-colors",
              active ? "border-foreground bg-foreground text-background" : cn("border-border hover:bg-muted", tone)
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {summary[k]} {short}
          </button>
        );
      })}
      {filter && (
        <button type="button" onClick={() => onFilter(undefined)} className="text-muted-foreground underline-offset-2 hover:underline">
          Show all
        </button>
      )}
    </div>
  );
}
