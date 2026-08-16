import { describe, it, expect, beforeEach } from "vitest";
import { useFormBuilderStore, makeQuestion } from "./use-form-builder-store";

const store = () => useFormBuilderStore.getState();
const firstSection = () => store().form.sections[0]!;
const firstQuestion = () => firstSection().questions[0]!;

describe("useFormBuilderStore", () => {
  beforeEach(() => store().reset());

  it("starts with one section, one question, step 1", () => {
    expect(store().form.sections).toHaveLength(1);
    expect(firstSection().questions).toHaveLength(1);
    expect(store().step).toBe(1);
  });

  it("adds a section (each seeded with a question) and removes it, but never below one", () => {
    store().addSection();
    expect(store().form.sections).toHaveLength(2);
    expect(store().form.sections[1]!.questions).toHaveLength(1);

    const secondId = store().form.sections[1]!.id;
    store().removeSection(secondId);
    expect(store().form.sections).toHaveLength(1);

    // Removing the last remaining section is a no-op.
    store().removeSection(store().form.sections[0]!.id);
    expect(store().form.sections).toHaveLength(1);
  });

  it("reorders sections", () => {
    store().addSection();
    const [a, b] = store().form.sections.map((s) => s.id);
    store().reorderSections(0, 1);
    expect(store().form.sections.map((s) => s.id)).toEqual([b, a]);
  });

  it("adds a question with per-type defaults", () => {
    const sid = firstSection().id;
    store().addQuestion(sid, "linear_scale");
    const q = firstSection().questions.at(-1)!;
    expect(q.type).toBe("linear_scale");
    expect(q.scaleMin).toBe(1);
    expect(q.scaleMax).toBe(5);
  });

  it("changeQuestionType to a grid sets rows/columns and clears options", () => {
    const sid = firstSection().id;
    const qid = firstQuestion().id;
    store().changeQuestionType(sid, qid, "multiple_choice_grid");
    const q = firstQuestion();
    expect(q.type).toBe("multiple_choice_grid");
    expect(q.rows?.map((r) => r.label)).toEqual(["Row 1"]);
    expect(q.columns?.map((c) => c.label)).toEqual(["Column 1"]);
    expect(q.options).toEqual([]);
  });

  it("changeQuestionType away from a grid clears grid fields", () => {
    const sid = firstSection().id;
    const qid = firstQuestion().id;
    store().changeQuestionType(sid, qid, "checkbox_grid");
    store().changeQuestionType(sid, qid, "short_answer");
    const q = firstQuestion();
    expect(q.rows).toBeUndefined();
    expect(q.columns).toBeUndefined();
  });

  it("caps options at 20 and updates option text immutably", () => {
    const sid = firstSection().id;
    const qid = firstQuestion().id;
    for (let i = 0; i < 50; i++) store().addOption(sid, qid);
    expect(firstQuestion().options.length).toBe(20);

    const optId = firstQuestion().options[0]!.id;
    store().updateOption(sid, qid, optId, "Renamed");
    expect(firstQuestion().options[0]!.text).toBe("Renamed");
  });

  it("removeOption removes only the targeted option", () => {
    const sid = firstSection().id;
    const qid = firstQuestion().id;
    store().addOption(sid, qid);
    const before = firstQuestion().options.length;
    const optId = firstQuestion().options[0]!.id;
    store().removeOption(sid, qid, optId);
    expect(firstQuestion().options.length).toBe(before - 1);
    expect(firstQuestion().options.find((o) => o.id === optId)).toBeUndefined();
  });

  it("duplicateQuestion clones with fresh ids for question, options AND grid items", () => {
    const sid = firstSection().id;
    const qid = firstQuestion().id;
    store().changeQuestionType(sid, qid, "multiple_choice_grid");
    store().duplicateQuestion(sid, qid);

    const qs = firstSection().questions;
    expect(qs).toHaveLength(2);
    const [orig, copy] = qs;
    expect(copy!.id).not.toBe(orig!.id);
    // grid arrays must be new refs with new ids (no shared references)
    expect(copy!.rows![0]!.id).not.toBe(orig!.rows![0]!.id);
    expect(copy!.rows).not.toBe(orig!.rows);
    expect(copy!.rows!.map((r) => r.label)).toEqual(orig!.rows!.map((r) => r.label));
  });

  it("updateQuestion patches fields immutably", () => {
    const sid = firstSection().id;
    const qid = firstQuestion().id;
    store().updateQuestion(sid, qid, { title: "New title", isRequired: true });
    expect(firstQuestion().title).toBe("New title");
    expect(firstQuestion().isRequired).toBe(true);
  });

  it("updateSettings and updateMeta merge without dropping other keys", () => {
    store().updateSettings({ collectEmail: true });
    expect(store().form.settings.collectEmail).toBe(true);
    expect(store().form.settings.showProgressBar).toBe(true); // untouched default
    store().updateMeta({ title: "T", isQuiz: true });
    expect(store().form.title).toBe("T");
    expect(store().form.isQuiz).toBe(true);
  });

  it("reset restores defaults", () => {
    store().addSection();
    store().setStep(3);
    store().reset();
    expect(store().form.sections).toHaveLength(1);
    expect(store().step).toBe(1);
    expect(store().successData).toBeNull();
  });

  it("makeQuestion produces valid per-type shapes", () => {
    expect(makeQuestion("file_upload").fileConfig).toEqual({ maxFiles: 1, maxSizeMb: 10, allowedTypes: [] });
    expect(makeQuestion("dropdown").options.length).toBe(1);
    expect(makeQuestion("checkbox_grid").rows?.[0]?.label).toBe("Row 1");
  });
});
