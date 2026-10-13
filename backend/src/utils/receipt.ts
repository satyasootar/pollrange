import { sendEmail } from "./mail.js";
import { z } from "zod";
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

/** Delivery outcome stored on the response so the creator can see who got their copy. */
export interface ReceiptStatus {
  status: "sent" | "failed";
  to: string;
  at: Date;
  error?: string;
}

export const receiptStatusZod = z
  .object({ status: z.enum(["sent", "failed"]), to: z.string(), at: z.date(), error: z.string().optional() })
  .optional();

/** Mongoose sub-schema for ReceiptStatus (shared by poll and form responses). */
export const receiptStatusSchema = {
  status: { type: String, enum: ["sent", "failed"] },
  to: String,
  at: Date,
  error: String,
};

/**
 * Emails a respondent a copy of their answers and records the outcome on the response.
 * Never throws, so callers can fire-and-forget it after a submit.
 */
export async function sendSubmissionCopy(
  to: string | undefined,
  receipt: Receipt,
  target: { model: { updateOne: (filter: any, update: any) => any }; id: unknown },
  idempotencyKey?: string
): Promise<ReceiptStatus | null> {
  if (!to) return null;
  let error: string | undefined;
  try {
    const r = await sendEmail({
      to,
      subject: `Your response to "${receipt.title}"`,
      html: receiptHtml(receipt),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
    if (!r.success) error = typeof r.error === "string" ? r.error : JSON.stringify(r.error);
  } catch (e: any) {
    error = e?.message ?? String(e);
  }
  if (error) console.error("[receipt] email failed", error);
  const status: ReceiptStatus = { status: error ? "failed" : "sent", to, at: new Date(), ...(error ? { error } : {}) };
  try {
    await target.model.updateOne({ _id: target.id }, { $set: { receipt: status } });
  } catch (e) {
    console.error("[receipt] could not record status", e);
  }
  return status;
}
