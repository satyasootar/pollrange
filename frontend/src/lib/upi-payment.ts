import type { FormQuestion, PaymentConfig } from "@/types";

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
  const totalAmount = selected.reduce((sum, option) => sum + option.amount, 0);
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
  config: PaymentConfig,
  values: Partial<Record<"number_of_selected_options" | "total_amount" | "selected_options" | "form_response_id" | "user_name", string | number>>
) {
  return config.messageTemplate.replace(/\{(number_of_selected_options|total_amount|selected_options|form_response_id|user_name)\}/g, (_, key: string) =>
    String(values[key as keyof typeof values] ?? "")
  );
}

export function buildUpiUri(upiId: string, amount: number, message: string) {
  if (!upiId.trim() || amount <= 0) return null;
  const params = new URLSearchParams({ pa: upiId.trim(), pn: "Form payment", am: amount.toFixed(2), cu: "INR", tn: message });
  return `upi://pay?${params.toString()}`;
}