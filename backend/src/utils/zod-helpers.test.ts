import { describe, it, expect } from "vitest";
import { optionalExpiresAtSchema } from "./zod-helpers.js";

describe("optionalExpiresAtSchema", () => {
  it("treats an empty string as no expiry (regression: was 'expected date, received Date')", () => {
    const r = optionalExpiresAtSchema.safeParse("");
    expect(r.success).toBe(true);
    expect(r.data).toBeNull();
  });

  it("accepts null and undefined as no expiry", () => {
    expect(optionalExpiresAtSchema.safeParse(null).success).toBe(true);
    expect(optionalExpiresAtSchema.safeParse(undefined).success).toBe(true);
  });

  it("coerces a valid ISO string into a Date", () => {
    const r = optionalExpiresAtSchema.safeParse("2030-01-01T00:00:00.000Z");
    expect(r.success).toBe(true);
    expect(r.data).toBeInstanceOf(Date);
  });

  it("rejects a genuinely invalid date with a clear, actionable message", () => {
    const r = optionalExpiresAtSchema.safeParse("not-a-real-date");
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]!.message).toMatch(/invalid expiry date/i);
    }
  });
});
