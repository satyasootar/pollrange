import { sendEmail } from "./mail.js";
import { escapeHtml } from "./html.js";

export interface ReceiptRow {
  question: string;
  answer: string;
}

export interface Receipt {
  kind: "poll" | "form";
  title: string;
  url: string;
  name?: string | undefined;
  rows: ReceiptRow[];
  /** Extra summary lines (quiz score, amount due…), shown above the answers. */
  notes?: string[];
}

export function receiptHtml({ kind, title, url, name, rows, notes = [] }: Receipt) {
  const cell = "padding:10px 12px;border-bottom:1px solid #e5e5e5;vertical-align:top;text-align:left";
  const body = rows
    .map(
      (r) =>
        `<tr><th style="${cell};font-weight:600;width:40%">${escapeHtml(r.question)}</th>` +
        `<td style="${cell};white-space:pre-wrap">${r.answer ? escapeHtml(r.answer) : '<span style="color:#999">No answer</span>'}</td></tr>`
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:600px">
<p>Hi ${escapeHtml(name || "there")},</p>
<p>Thanks for responding to the ${kind} <strong>${escapeHtml(title)}</strong>. Here is a copy of what you submitted.</p>
${notes.map((n) => `<p><strong>${escapeHtml(n)}</strong></p>`).join("")}
<table style="border-collapse:collapse;width:100%;border-top:1px solid #e5e5e5">${body}</table>
<p style="margin-top:20px"><a href="${escapeHtml(url)}">Open the ${kind}</a></p>
<p style="color:#888;font-size:12px">You got this email because this address was used to submit the ${kind} on Kollects. If that wasn't you, you can ignore it.</p>
</div>`;
}

/** Emails a respondent a copy of their answers. Fire-and-forget: never fails the submit. */
export function sendSubmissionCopy(to: string | undefined, receipt: Receipt, idempotencyKey: string) {
  if (!to) return;
  void sendEmail({ to, subject: `Your response to "${receipt.title}"`, html: receiptHtml(receipt), idempotencyKey })
    .then((r) => !r.success && console.error("[receipt] email failed", r.error))
    .catch((e) => console.error("[receipt] email failed", e));
}
