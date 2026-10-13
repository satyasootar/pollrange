import { Mail, MailCheck, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDatetime } from "@/lib/utils";
import type { ReceiptInfo } from "@/types";

/**
 * Shows whether a respondent got their emailed copy, with a button to send it
 * (again) by hand. Respondents with no email address just say so.
 */
export function ReceiptStatus({
  receipt,
  email,
  sending,
  onSend,
}: {
  receipt: ReceiptInfo | null;
  email: string | null;
  sending: boolean;
  onSend: () => void;
}) {
  if (!email && !receipt) return <span className="whitespace-nowrap text-xs text-muted-foreground">No email</span>;

  const { label, Icon, tone } =
    receipt?.status === "sent"
      ? { label: "Copy sent", Icon: MailCheck, tone: "text-emerald-600" }
      : receipt?.status === "failed"
        ? { label: "Email failed", Icon: MailX, tone: "text-destructive" }
        : { label: "Not sent", Icon: Mail, tone: "text-muted-foreground" };
  const detail = receipt
    ? `${receipt.status === "sent" ? "Sent" : "Failed"} to ${receipt.to} · ${formatDatetime(receipt.at)}${receipt.error ? ` · ${receipt.error}` : ""}`
    : "No copy has been emailed yet";

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone)} title={detail}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
        <span className="sr-only">. {detail}</span>
      </span>
      <Button type="button" variant="outline" size="xs" className="h-7 px-2" disabled={sending} onClick={onSend}>
        {sending ? "Sending…" : receipt?.status === "sent" ? "Resend" : "Send copy"}
      </Button>
    </span>
  );
}
