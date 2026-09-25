import { describe, it, expect } from "vitest";
import { createFormSchema, reopenFormSchema } from "./form.validation.js";

const baseQuestion = {
  order: 0,
  title: "Q1",
  isRequired: false,
};

function form(questions: any[]) {
  return {
    title: "My form",
    responseMode: "anonymous" as const,
    sections: [{ order: 0, questions }],
  };
}

describe("createFormSchema", () => {
  it("accepts a short answer question", () => {
    const r = createFormSchema.safeParse(form([{ ...baseQuestion, type: "short_answer" }]));
    expect(r.success).toBe(true);
  });

  it("accepts a URL-safe custom slug", () => {
    const r = createFormSchema.safeParse({ ...form([{ ...baseQuestion, type: "short_answer" }]), slug: "event_signup-2026" });
    expect(r.success).toBe(true);
  });

  it("rejects an unsafe custom slug", () => {
    const r = createFormSchema.safeParse({ ...form([{ ...baseQuestion, type: "short_answer" }]), slug: "event signup" });
    expect(r.success).toBe(false);
  });

  it("requires options on choice types", () => {
    const r = createFormSchema.safeParse(form([{ ...baseQuestion, type: "multiple_choice" }]));
    expect(r.success).toBe(false);
  });

  it("accepts a choice question with options", () => {
    const r = createFormSchema.safeParse(
      form([{ ...baseQuestion, type: "dropdown", options: [{ text: "A", order: 0 }] }])
    );
    expect(r.success).toBe(true);
  });

  it("requires rows and columns on grids", () => {
    const r = createFormSchema.safeParse(form([{ ...baseQuestion, type: "checkbox_grid", rows: ["r1"] }]));
    expect(r.success).toBe(false);
  });

  it("requires scaleMin/scaleMax on scales", () => {
    const r = createFormSchema.safeParse(form([{ ...baseQuestion, type: "linear_scale" }]));
    expect(r.success).toBe(false);
  });

  it("rejects scaleMax <= scaleMin", () => {
    const r = createFormSchema.safeParse(
      form([{ ...baseQuestion, type: "linear_scale", scaleMin: 5, scaleMax: 3 }])
    );
    expect(r.success).toBe(false);
  });

  it("requires at least one section", () => {
    const r = createFormSchema.safeParse({ title: "x", responseMode: "anonymous", sections: [] });
    expect(r.success).toBe(false);
  });

  it("strips unknown server-controlled fields (no shareToken passthrough)", () => {
    const r = createFormSchema.safeParse({
      ...form([{ ...baseQuestion, type: "short_answer" }]),
      shareToken: "hacked",
      status: "published",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("shareToken" in r.data).toBe(false);
      expect("status" in r.data).toBe(false);
    }
  });

  it("regression: an empty-string expiresAt (no expiry) does not 400", () => {
    // The form builder represents "no expiry" as "" — this used to fail with
    // Zod's confusing "expected date, received Date" message.
    const r = createFormSchema.safeParse({
      ...form([{ ...baseQuestion, type: "short_answer" }]),
      expiresAt: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.expiresAt).toBeNull();
  });

  it("coerces a valid ISO expiresAt into a Date", () => {
    const r = createFormSchema.safeParse({
      ...form([{ ...baseQuestion, type: "short_answer" }]),
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.expiresAt).toBeInstanceOf(Date);
  });
});

describe("reopenFormSchema", () => {
  it("treats an empty string the same as forever", () => {
    const parsed = reopenFormSchema.parse({ expiresAt: "" });
    expect(parsed.expiresAt).toBeNull();
  });

  it("rejects a non-date string", () => {
    expect(reopenFormSchema.safeParse({ expiresAt: "whenever" }).success).toBe(false);
  });
});
