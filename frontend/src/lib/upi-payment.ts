import type { BuilderFormQuestion, FormQuestion, PaymentConfig } from "@/types";

/** Mirrors backend payment.util.ts — keep in sync. handle@provider, e.g. name@okaxis. */
export const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

/** Ref first so it survives UPI apps truncating long notes; lets creators match payments to responses. */
export const DEFAULT_PAYMENT_MESSAGE = "Ref {form_response_id} - {selected_options}";

export const PAYMENT_TOKENS = [
  { token: "{form_response_id}", label: "Response ID" },
  { token: "{selected_options}", label: "Selected options" },
  { token: "{total_amount}", label: "Total" },
  { token: "{number_of_selected_options}", label: "Count" },
  { token: "{user_name}", label: "Name" },
] as const;

const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
/** ₹100 for whole rupees, ₹250.50 when there are paise. */
export const formatInr = (amount: number) => (Number.isInteger(amount) ? inrWhole : inrPaise).format(amount);

const roundPaise = (n: number) => Math.round(n * 100) / 100;

export interface PaymentCalculation {
  selectedOptions: { id: string; text: string; amount: number }[];
  selectedCount: number;
  totalAmount: number;
  message: string;
}

export function calculatePayment(q: FormQuestion, selectedOptionIds: string[], responseId = "pending", userName = ""): PaymentCalculation | null {
  const config = q.payment;
  if (!config?.enabled) return null;
  const selected = (q.options ?? [])
    .filter((option) => selectedOptionIds.includes(option._id))
    .map((option) => ({ id: option._id, text: option.text, amount: option.amount ?? 0 }));
  const totalAmount = roundPaise(selected.reduce((sum, option) => sum + option.amount, 0));
  return {
    selectedOptions: selected,
    selectedCount: selected.length,
    totalAmount,
    message: renderPaymentMessage(config, {
      number_of_selected_options: selected.length,
      total_amount: totalAmount,
      selected_options: selected.map((option) => option.text).join(", "),
      form_response_id: responseId,
      user_name: userName,
    }),
  };
}

export function renderPaymentMessage(
  config: Pick<PaymentConfig, "messageTemplate">,
  values: Partial<Record<"number_of_selected_options" | "total_amount" | "selected_options" | "form_response_id" | "user_name", string | number>>
) {
  return config.messageTemplate.replace(/\{(number_of_selected_options|total_amount|selected_options|form_response_id|user_name)\}/g, (_, key: string) =>
    String(values[key as keyof typeof values] ?? "")
  );
}

// ponytail: hard 80-char cap on the note; some UPI apps reject longer `tn` values.
const MAX_NOTE = 80;

export function buildUpiUri(upiId: string, amount: number, message: string, payeeName = "Form payment") {
  if (!UPI_ID_REGEX.test(upiId.trim()) || !(amount > 0)) return null;
  const params = new URLSearchParams({
    pa: upiId.trim(),
    pn: payeeName.slice(0, 50),
    am: amount.toFixed(2),
    cu: "INR",
    tn: message.slice(0, MAX_NOTE),
  });
  return `upi://pay?${params.toString()}`;
}

/** Selection-count hint for respondents, e.g. "Choose 1–3". */
export function selectionHint(config?: PaymentConfig): string | null {
  const min = config?.minSelections;
  const max = config?.maxSelections;
  if (min && max) return min === max ? `Choose exactly ${min}` : `Choose ${min}–${max}`;
  if (min) return `Choose at least ${min}`;
  if (max) return `Choose up to ${max}`;
  return null;
}

/** Client-side mirror of the server's selection-count check; null when OK. */
export function selectionError(q: FormQuestion, selectedCount: number): string | null {
  const config = q.payment;
  if (!config?.enabled || selectedCount === 0) return null;
  if (config.minSelections != null && selectedCount < config.minSelections)
    return `Select at least ${config.minSelections} option(s) for "${q.title}"`;
  if (config.maxSelections != null && selectedCount > config.maxSelections)
    return `Select at most ${config.maxSelections} option(s) for "${q.title}"`;
  return null;
}

/** First problem with a builder question's payment setup, or null when it can be published. */
export function paymentSetupError(q: BuilderFormQuestion): string | null {
  const p = q.payment;
  if (!p?.enabled) return null;
  const label = q.title.trim() || "a payment question";
  if (!UPI_ID_REGEX.test(p.upiId.trim())) return `Add a valid UPI ID (like name@okaxis) to "${label}".`;
  if (!q.options.some((o) => (o.amount ?? 0) > 0)) return `Set a price on at least one option in "${label}".`;
  if (p.minSelections != null && p.maxSelections != null && p.minSelections > p.maxSelections)
    return `Minimum selections can't exceed maximum in "${label}".`;
  return null;
}
