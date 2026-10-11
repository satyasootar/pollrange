import { useState } from "react";
import { CheckCircle2, Copy, Check, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { buildUpiUri, formatInr } from "@/lib/upi-payment";
import type { SubmitPaymentDue } from "@/types";

/** Post-submit pay screen. Amount comes from the server so it can't drift from what was recorded. */
export function PaymentDue({ payment, payeeName, confirmationMessage }: { payment: SubmitPaymentDue; payeeName: string; confirmationMessage: string }) {
  const [copied, setCopied] = useState(false);
  const uri = buildUpiUri(payment.upiId, payment.totalAmount, payment.message, payeeName);

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(payment.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; the ID is still visible to copy by hand */
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-6 py-3 text-xs text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> {confirmationMessage}
        </div>

        <div className="space-y-5 p-6 text-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Complete your payment</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{formatInr(payment.totalAmount)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{payment.selectedOptions.join(" · ")}</p>
          </div>

          {uri ? (
            <>
              <a
                href={uri}
                className="flex min-h-11 w-full items-center justify-center gap-2 bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:hidden"
              >
                <Smartphone className="h-4 w-4" aria-hidden="true" /> Pay with UPI app
              </a>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-2">
                  <QRCodeSVG value={uri} size={176} aria-label="UPI payment QR code" />
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="sm:hidden">Or scan</span>
                  <span className="hidden sm:inline">Scan</span> with GPay, PhonePe, Paytm or any UPI app
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Send the amount above to the UPI ID below from any UPI app.</p>
          )}

          <div className="space-y-2 border-t border-border pt-4 text-left text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Pay to</span>
              <button
                type="button"
                onClick={copyUpiId}
                className="flex min-w-0 items-center gap-1.5 font-mono text-foreground hover:text-primary"
                aria-label={`Copy UPI ID ${payment.upiId}`}
              >
                <span className="truncate">{payment.upiId}</span>
                {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
              </button>
            </div>
            <div className="flex justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">Note</span>
              <span className="break-all text-right font-mono">{payment.message.slice(0, 80)}</span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Keep the note unchanged so the organiser can match your payment. Save a screenshot of the receipt.
          </p>
        </div>
      </div>
    </div>
  );
}
