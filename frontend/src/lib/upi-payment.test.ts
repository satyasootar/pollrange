import { describe, expect, it } from "vitest";
import { buildUpiUri, calculatePayment } from "./upi-payment";
import type { FormQuestion } from "@/types";

describe("upi payment helpers", () => {
  it("calculates selected option totals and expands the message", () => {
    const question = {
      _id: "q1", order: 0, type: "checkboxes", title: "Activities", isRequired: false,
      options: [{ _id: "a", text: "Coding", order: 0, amount: 10 }, { _id: "b", text: "AI", order: 1, amount: 30 }],
      payment: { enabled: true, upiId: "host@upi", messageTemplate: "{number_of_selected_options} - INR {total_amount}" },
    } satisfies FormQuestion;
    const result = calculatePayment(question, ["a", "b"]);
    expect(result?.totalAmount).toBe(40);
    expect(result?.message).toBe("2 - INR 40");
    expect(buildUpiUri("host@upi", result!.totalAmount, result!.message)).toContain("am=40.00");
  });
});