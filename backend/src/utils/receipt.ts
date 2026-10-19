import { sendEmail } from "./mail.js";
import { z } from "zod";
import { Schema } from "mongoose";
import { escapeHtml } from "./html.js";
import { emailTheme, renderEmail, type EmailBrand } from "./email-layout.js";

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
  /** Extra summary lines as "Label: value" (quiz score, amount due…), shown as highlighted stats. */
  notes?: string[];
  /** The form's cover image, shown as a banner. */
  bannerUrl?: string | undefined;
  /** The creator's brand (colours, logo, font). Loaded only when an email is actually sent. */
  loadBrand?: () => Promise<EmailBrand | null>;
}

const noteParts = (n: string) => {
  const i = n.indexOf(": ");
  return i === -1 ? { label: "", value: n } : { label: n.slice(0, i), value: n.slice(i + 2) };
};

export function receiptHtml({ kind, title, url, name, rows, notes = [], bannerUrl }: Receipt, brand?: EmailBrand | null) {
  const t = emailTheme(brand);
  const stats = notes.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 6px"><tr>${notes
        .map(noteParts)
        .map(
          ({ label, value }) =>
            `<td style="background:${t.soft};border-radius:${t.radius}px;padding:10px 16px">` +
            (label ? `<div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#71717a">${escapeHtml(label)}</div>` : "") +
            `<div style="font-size:20px;font-weight:700;color:${t.accent}">${escapeHtml(value)}</div></td><td style="width:8px"></td>`
        )
        .join("")}</tr></table>`
    : "";
  const answers = rows
    .map(
      (r) =>
        `<tr><td style="padding:14px 0;border-top:1px solid #f4f4f5">` +
        `<div style="font-size:13px;font-weight:600;color:#71717a;margin-bottom:4px">${escapeHtml(r.question)}</div>` +
        `<div style="font-size:15px;color:#18181b;white-space:pre-wrap;border-left:3px solid ${r.answer ? t.accent : "#e4e4e7"};padding-left:10px">` +
        `${r.answer ? escapeHtml(r.answer) : '<span style="color:#a1a1aa;font-style:italic">No answer</span>'}</div></td></tr>`
    )
    .join("");
  return renderEmail(
    {
      brand,
      bannerUrl,
      preheader: `A copy of your answers to "${title}".`,
      heading: "Thanks, your response is in",
      bodyHtml:
        `<p style="margin:0 0 4px">Hi ${escapeHtml(name || "there")}, here's a copy of what you submitted to the ${kind} <strong style="color:#18181b">${escapeHtml(title)}</strong>.</p>` +
        stats +
        (rows.length
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 18px">${answers}</table>`
          : ""),
      cta: { label: `Open the ${kind}`, url },
      footnote: `You got this email because this address was used to submit the ${kind}. If that wasn't you, you can ignore it.`,
    },
    t
  );
}

/** Plain-text twin of the receipt, for clients that don't render HTML (and better deliverability). */
export function receiptText({ kind, title, url, name, rows, notes = [] }: Receipt) {
  return [
    `Hi ${name || "there"},`,
    "",
    `Here's a copy of what you submitted to the ${kind} "${title}".`,
    ...(notes.length ? ["", ...notes] : []),
    "",
    ...rows.flatMap((r) => [r.question, `  ${r.answer || "No answer"}`]),
    "",
    `Open the ${kind}: ${url}`,
  ].join("\n");
}

/** One delivery attempt, stored on the response so the creator can see who got their copy. */
export interface ReceiptStatus {
  status: "sent" | "failed";
  to: string;
  at: Date;
  /** "auto" = sent on submit, "manual" = the creator pressed Send copy. */
  trigger: "auto" | "manual";
  error?: string;
}

const receiptStatusShape = z.object({
  status: z.enum(["sent", "failed"]),
  to: z.string(),
  at: z.date(),
  trigger: z.enum(["auto", "manual"]),
  error: z.string().optional(),
});
export const receiptStatusZod = receiptStatusShape.optional();
export const receiptHistoryZod = z.array(receiptStatusShape).optional();

/** Mongoose sub-schema for one attempt (shared by poll and form responses). */
export const receiptStatusSchema = new Schema(
  {
    status: { type: String, enum: ["sent", "failed"] },
    to: String,
    at: Date,
    trigger: { type: String, enum: ["auto", "manual"] },
    error: String,
  },
  { _id: false }
);

/** Attempts kept per response; older ones roll off. */
export const RECEIPT_HISTORY_LIMIT = 20;

/**
 * Emails a respondent a copy of their answers and records the attempt on the response:
 * `receipt` is the latest outcome, `receiptHistory` keeps every attempt (newest last).
 * Never throws, so callers can fire-and-forget it after a submit.
 */
export async function sendSubmissionCopy(
  to: string | undefined,
  receipt: Receipt,
  target: { model: { updateOne: (filter: any, update: any) => any }; id: unknown },
  trigger: "auto" | "manual"
): Promise<ReceiptStatus | null> {
  if (!to) return null;
  let error: string | undefined;
  try {
    // A brand lookup failure must not cost the respondent their copy: fall back to the Kollects look.
    const brand = receipt.loadBrand ? await receipt.loadBrand().catch(() => null) : null;
    const r = await sendEmail({
      to,
      subject: `Your response to "${receipt.title}"`,
      html: receiptHtml(receipt, brand),
      text: receiptText(receipt),
      // Auto sends dedupe retries of the same submit; manual resends must always go out.
      ...(trigger === "auto" ? { idempotencyKey: `receipt-${String(target.id)}` } : {}),
    });
    if (!r.success) error = typeof r.error === "string" ? r.error : JSON.stringify(r.error);
  } catch (e: any) {
    error = e?.message ?? String(e);
  }
  if (error) console.error("[receipt] email failed", error);
  const status: ReceiptStatus = { status: error ? "failed" : "sent", to, at: new Date(), trigger, ...(error ? { error } : {}) };
  try {
    await target.model.updateOne(
      { _id: target.id },
      { $set: { receipt: status }, $push: { receiptHistory: { $each: [status], $slice: -RECEIPT_HISTORY_LIMIT } } }
    );
  } catch (e) {
    console.error("[receipt] could not record status", e);
  }
  return status;
}
