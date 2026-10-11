import { describe, it, expect } from "vitest";
import { calculatePayment, UPI_ID_REGEX, DEFAULT_PAYMENT_MESSAGE } from "./payment.util.js";

const question = (enabled = true) => ({
  options: [
    { _id: "a", text: "Coding", amount: 0.1 },
    { _id: "b", text: "AI", amount: 0.2 },
    { _id: "c", text: "Free talk" },
  ],
  payment: { enabled, upiId: "host@okaxis", messageTemplate: DEFAULT_PAYMENT_MESSAGE },
});

describe("calculatePayment", () => {
  it("sums selected options, rounded to paise", () => {
    const r = calculatePayment(question(), ["a", "b"], "resp1");
    expect(r?.totalAmount).toBe(0.3); // not 0.30000000000000004
    expect(r?.selectedOptions).toEqual(["Coding", "AI"]);
    expect(r?.selectedCount).toBe(2);
  });

  it("puts the response ref in the default note", () => {
    expect(calculatePayment(question(), ["a"], "resp1")?.message).toBe("Ref resp1 - Coding");
  });

  it("treats unpriced options as free and ignores unknown ids", () => {
    const r = calculatePayment(question(), ["c", "zzz"], "resp1");
    expect(r?.totalAmount).toBe(0);
    expect(r?.selectedOptionIds).toEqual(["c"]);
  });

  it("returns null when payment is disabled", () => {
    expect(calculatePayment(question(false), ["a"], "resp1")).toBeNull();
  });
});

describe("UPI_ID_REGEX", () => {
  it.each(["name@okaxis", "9876543210@ybl", "first.last-1@paytm", "a_b@upi"])("accepts %s", (id) => {
    expect(UPI_ID_REGEX.test(id)).toBe(true);
  });
  it.each(["", "name", "name@", "@okaxis", "a@okaxis", "name@ok axis", "name@1bank", "upi://pay?pa=x@y"])("rejects %s", (id) => {
    expect(UPI_ID_REGEX.test(id)).toBe(false);
  });
});
