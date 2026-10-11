export interface PaymentOption {
  _id: unknown;
  text: string;
  amount?: number;
}

export interface PaymentConfig {
  enabled: boolean;
  upiId: string;
  messageTemplate: string;
  minSelections?: number;
  maxSelections?: number;
}

/** handle@provider, e.g. name@okaxis or 9876543210@ybl. */
export const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

/** Ref first so it survives UPI apps truncating long notes; lets creators match payments to responses. */
export const DEFAULT_PAYMENT_MESSAGE = "Ref {form_response_id} - {selected_options}";

export function renderPaymentMessage(template: string, values: Record<string, string | number>) {
  return template.replace(
    /\{(number_of_selected_options|total_amount|selected_options|form_response_id|user_name)\}/g,
    (_, key: string) => String(values[key] ?? "")
  );
}

export function calculatePayment(
  question: { options?: PaymentOption[]; payment?: PaymentConfig },
  selectedOptionIds: string[],
  responseId: string,
  userName = ""
) {
  const config = question.payment;
  if (!config?.enabled) return null;
  const selectedOptions = (question.options ?? [])
    .filter((option) => selectedOptionIds.includes(String(option._id)))
    .map((option) => ({ id: String(option._id), text: option.text, amount: option.amount ?? 0 }));
  // Round to paise so float sums (0.1 + 0.2) never leak into the stored amount.
  const totalAmount = Math.round(selectedOptions.reduce((sum, option) => sum + option.amount, 0) * 100) / 100;
  return {
    selectedOptionIds: selectedOptions.map((option) => option.id),
    selectedOptions: selectedOptions.map((option) => option.text),
    selectedCount: selectedOptions.length,
    totalAmount,
    message: renderPaymentMessage(config.messageTemplate, {
      number_of_selected_options: selectedOptions.length,
      total_amount: totalAmount,
      selected_options: selectedOptions.map((option) => option.text).join(", "),
      form_response_id: responseId,
      user_name: userName,
    }),
    upiId: config.upiId,
    status: "pending" as const,
  };
}
