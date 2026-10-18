import { describe, it, expect } from "vitest";
import { gridLabels, formEntityToBuilder, builderToPreviewForm } from "./form-mappers";
import type { Form, FormBuilderForm } from "@/types";

describe("gridLabels", () => {
  it("returns undefined for undefined / empty", () => {
    expect(gridLabels(undefined)).toBeUndefined();
    expect(gridLabels([])).toBeUndefined();
  });

  it("drops blank/whitespace labels and returns undefined when all blank", () => {
    expect(gridLabels([{ id: "a", label: "" }, { id: "b", label: "   " }])).toBeUndefined();
  });

  it("trims labels and preserves order of the non-empty ones", () => {
    expect(
      gridLabels([
        { id: "a", label: "  Row 1 " },
        { id: "b", label: "" },
        { id: "c", label: "Row 2" },
      ])
    ).toEqual(["Row 1", "Row 2"]);
  });
});

// Minimal entity builder that lets us control order + grid fields.
function entity(): Form {
  return {
    _id: "f1",
    creatorId: "u1",
    title: "Survey",
    description: undefined,
    coverImageUrl: "https://cdn/x.png",
    shareToken: "tok",
    isQuiz: true,
    status: "active",
    responseMode: "anonymous",
    expiresAt: "2026-08-16T10:30:00.000Z",
    totalResponses: 0,
    isDeleted: false,
    isResultsPublic: false,
    settings: {
      collectEmail: true,
      limitOneResponse: false,
      allowResponseEdit: false,
      showProgressBar: true,
      shuffleQuestions: false,
      releaseScoreImmediately: true,
    },
    sections: [
      // deliberately out of order to test sorting
      {
        _id: "s2",
        order: 1,
        questions: [{ _id: "q2", order: 0, type: "short_answer", title: "Second", isRequired: false }],
      },
      {
        _id: "s1",
        order: 0,
        questions: [
          {
            _id: "qGrid",
            order: 1,
            type: "multiple_choice_grid",
            title: "Grid",
            isRequired: true,
            rows: ["R1", "R2"],
            columns: ["C1"],
          },
          {
            _id: "qChoice",
            order: 0,
            type: "multiple_choice",
            title: "Choice",
            isRequired: false,
            options: [
              { _id: "o1", text: "A", order: 0 },
              { _id: "o2", text: "B", order: 1 },
            ],
          },
        ],
      },
    ],
    createdAt: "",
    updatedAt: "",
  };
}

describe("formEntityToBuilder", () => {
  it("sorts sections and questions by order", () => {
    const b = formEntityToBuilder(entity());
    expect(b.sections.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(b.sections[0]!.questions.map((q) => q.id)).toEqual(["qChoice", "qGrid"]);
  });

  it("maps _id → id for section/question/option and keeps option text", () => {
    const b = formEntityToBuilder(entity());
    const choice = b.sections[0]!.questions[0]!;
    expect(choice.options.map((o) => ({ id: o.id, text: o.text }))).toEqual([
      { id: "o1", text: "A" },
      { id: "o2", text: "B" },
    ]);
  });

  it("converts grid rows/columns string[] → GridItem[] preserving labels", () => {
    const b = formEntityToBuilder(entity());
    const grid = b.sections[0]!.questions[1]!;
    expect(grid.rows?.map((r) => r.label)).toEqual(["R1", "R2"]);
    expect(grid.columns?.map((c) => c.label)).toEqual(["C1"]);
    expect(grid.rows?.every((r) => typeof r.id === "string" && r.id.length > 0)).toBe(true);
  });

  it("shows expiresAt as a local datetime-local value and defaults description", () => {
    const e = entity();
    const b = formEntityToBuilder(e);
    // The stored instant is UTC; the input shows the creator's own wall-clock time and round-trips exactly.
    expect(b.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(b.expiresAt).toISOString()).toBe(new Date(e.expiresAt!).toISOString());
    expect(b.description).toBe("");
    expect(b.coverImageUrl).toBe("https://cdn/x.png");
  });

  it("leaves expiresAt empty when the form has none", () => {
    const e = entity();
    e.expiresAt = undefined;
    expect(formEntityToBuilder(e).expiresAt).toBe("");
  });
});

function builder(): FormBuilderForm {
  return {
    title: "Preview me",
    description: "desc",
    isQuiz: true,
    expiresAt: "",
    responseMode: "anonymous",
    settings: {
      collectEmail: false,
      limitOneResponse: false,
      allowResponseEdit: false,
      showProgressBar: true,
      shuffleQuestions: false,
      releaseScoreImmediately: true,
      confirmationMessage: "Thanks",
    },
    sections: [
      {
        id: "sb1",
        questions: [
          {
            id: "qb1",
            type: "checkbox_grid",
            title: "Grid",
            isRequired: true,
            options: [],
            rows: [
              { id: "r1", label: " Row A " },
              { id: "r2", label: "" }, // blank → must be dropped in preview
            ],
            columns: [{ id: "c1", label: "Col A" }],
            points: 4,
          },
          {
            id: "qb2",
            type: "dropdown",
            title: "Pick",
            isRequired: false,
            options: [
              { id: "ob1", text: "One" },
              { id: "ob2", text: "Two" },
            ],
          },
        ],
      },
    ],
  };
}

describe("builderToPreviewForm", () => {
  it("maps builder ids → entity _id and assigns order by index", () => {
    const p = builderToPreviewForm(builder());
    expect(p.sections[0]!._id).toBe("sb1");
    expect(p.sections[0]!.order).toBe(0);
    const [grid, dropdown] = p.sections[0]!.questions;
    expect(grid!._id).toBe("qb1");
    expect(grid!.order).toBe(0);
    expect(dropdown!.order).toBe(1);
    expect(dropdown!.options?.map((o) => ({ _id: o._id, text: o.text, order: o.order }))).toEqual([
      { _id: "ob1", text: "One", order: 0 },
      { _id: "ob2", text: "Two", order: 1 },
    ]);
  });

  it("applies gridLabels: trims and drops blank rows/columns", () => {
    const p = builderToPreviewForm(builder());
    const grid = p.sections[0]!.questions[0]!;
    expect(grid.rows).toEqual(["Row A"]); // blank row dropped, trimmed
    expect(grid.columns).toEqual(["Col A"]);
  });

  it("preserves quiz + points metadata", () => {
    const p = builderToPreviewForm(builder());
    expect(p.isQuiz).toBe(true);
    expect(p.sections[0]!.questions[0]!.points).toBe(4);
  });
});
