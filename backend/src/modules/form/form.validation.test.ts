import { describe, it, expect } from "vitest";
import { createFormSchema } from "./form.validation.js";

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
});
