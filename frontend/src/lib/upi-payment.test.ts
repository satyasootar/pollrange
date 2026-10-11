import { describe, expect, it } from "vitest";
import {
  buildUpiUri,
  calculatePayment,
  paymentSetupError,
  selectionError,
  selectionHint,
  UPI_ID_REGEX,
} from "./upi-payment";
import type { BuilderFormQuestion, FormQuestion } from "@/types";

const question = {
  _id: "q1", order: 0, type: "checkboxes", title: "Activities", isRequired: false,
  options: [{ _id: "a", text: "Coding", order: 0, amount: 10 }, { _id: "b", text: "AI", order: 1, amount: 30 }],
  payment: { enabled: true, upiId: "host@upi", messageTemplate: "{number_of_selected_options} - INR {total_amount}" },
} satisfies FormQuestion;

const builderQ = (o: Partial<BuilderFormQuestion> = {}): BuilderFormQuestion => ({
  id: "q1", type: "checkboxes", title: "Activities", isRequired: false,
  options: [{ id: "a", text: "Coding", amount: 100 }],
  payment: { enabled: true, upiId: "host@okaxis", messageTemplate: "x" },
  ...o,
});

describe("upi payment helpers", () => {
  it("calculates selected option totals and expands the message", () => {
    const result = calculatePayment(question, ["a", "b"]);
    expect(result?.totalAmount).toBe(40);
    expect(result?.message).toBe("2 - INR 40");
    expect(buildUpiUri("host@upi", result!.totalAmount, result!.message)).toContain("am=40.00");
  });

  it("rounds float totals to paise", () => {
    const q = { ...question, options: [{ _id: "a", text: "A", order: 0, amount: 0.1 }, { _id: "b", text: "B", order: 1, amount: 0.2 }] };
    expect(calculatePayment(q, ["a", "b"])?.totalAmount).toBe(0.3);
  });

  it("buildUpiUri refuses an invalid UPI ID or a non-positive amount", () => {
    expect(buildUpiUri("nope", 10, "m")).toBeNull();
    expect(buildUpiUri("host@okaxis", 0, "m")).toBeNull();
    expect(buildUpiUri("host@okaxis", NaN, "m")).toBeNull();
  });

  it("buildUpiUri encodes payee/note and caps the note at 80 chars", () => {
    const uri = buildUpiUri(" host@okaxis ", 99.5, "x".repeat(200), "Tech Fest & Co")!;
    const params = new URLSearchParams(uri.split("?")[1]);
    expect(params.get("pa")).toBe("host@okaxis");
    expect(params.get("am")).toBe("99.50");
    expect(params.get("cu")).toBe("INR");
    expect(params.get("pn")).toBe("Tech Fest & Co");
    expect(params.get("tn")).toHaveLength(80);
  });

  it("UPI_ID_REGEX matches the backend's accept/reject cases", () => {
    for (const ok of ["name@okaxis", "9876543210@ybl", "first.last-1@paytm"]) expect(UPI_ID_REGEX.test(ok)).toBe(true);
    for (const bad of ["", "name", "name@", "@okaxis", "name@1bank", "a b@upi"]) expect(UPI_ID_REGEX.test(bad)).toBe(false);
  });

  it("selectionHint describes min/max limits", () => {
    const p = question.payment;
    expect(selectionHint(p)).toBeNull();
    expect(selectionHint({ ...p, minSelections: 1, maxSelections: 3 })).toBe("Choose 1–3");
    expect(selectionHint({ ...p, minSelections: 2, maxSelections: 2 })).toBe("Choose exactly 2");
    expect(selectionHint({ ...p, minSelections: 2 })).toBe("Choose at least 2");
    expect(selectionHint({ ...p, maxSelections: 2 })).toBe("Choose up to 2");
  });

  it("selectionError mirrors the server's min/max check but ignores an empty pick", () => {
    const q = { ...question, payment: { ...question.payment, minSelections: 2, maxSelections: 2 } };
    expect(selectionError(q, 0)).toBeNull();
    expect(selectionError(q, 1)).toMatch(/at least 2/);
    expect(selectionError(q, 2)).toBeNull();
    expect(selectionError(q, 3)).toMatch(/at most 2/);
  });

  it("paymentSetupError flags each broken builder setup", () => {
    expect(paymentSetupError(builderQ())).toBeNull();
    expect(paymentSetupError(builderQ({ payment: undefined }))).toBeNull();
    expect(paymentSetupError(builderQ({ payment: { enabled: true, upiId: "", messageTemplate: "x" } }))).toMatch(/UPI ID/);
    expect(paymentSetupError(builderQ({ options: [{ id: "a", text: "Coding" }] }))).toMatch(/price/);
    expect(
      paymentSetupError(builderQ({ payment: { enabled: true, upiId: "host@okaxis", messageTemplate: "x", minSelections: 3, maxSelections: 1 } }))
    ).toMatch(/Minimum/);
  });
});
