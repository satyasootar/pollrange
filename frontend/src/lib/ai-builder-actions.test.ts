import { describe, it, expect, beforeEach } from "vitest";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { applyPollActions, applyFormActions } from "./ai-builder-actions";

const pollStore = () => usePollBuilderStore.getState();
const formStore = () => useFormBuilderStore.getState();

describe("applyPollActions", () => {
  beforeEach(() => pollStore().reset());

  it("fills the seeded blank starter question instead of appending past it", () => {
    expect(pollStore().form.questions).toHaveLength(1); // pristine seed

    applyPollActions([
      { kind: "add_poll_question", question: { text: "Favourite colour?", type: "single_choice", options: ["Red", "Blue"] } },
    ]);

    const qs = pollStore().form.questions;
    expect(qs).toHaveLength(1); // filled in place, not appended
    expect(qs[0]!.text).toBe("Favourite colour?");
    expect(qs[0]!.options.map((o) => o.text)).toEqual(["Red", "Blue"]);
  });

  it("appends the second question below the now-filled first one", () => {
    applyPollActions([{ kind: "add_poll_question", question: { text: "Q1", type: "open_ended" } }]);
    applyPollActions([{ kind: "add_poll_question", question: { text: "Q2", type: "open_ended" } }]);

    const qs = pollStore().form.questions;
    expect(qs).toHaveLength(2);
    expect(qs.map((q) => q.text)).toEqual(["Q1", "Q2"]);
  });

  it("does not overwrite a question the user has already started filling in", () => {
    const id = pollStore().form.questions[0]!.id;
    pollStore().updateQuestion(id, { text: "User's own question" });

    applyPollActions([{ kind: "add_poll_question", question: { text: "AI question", type: "open_ended" } }]);

    const qs = pollStore().form.questions;
    expect(qs).toHaveLength(2);
    expect(qs[0]!.text).toBe("User's own question");
    expect(qs[1]!.text).toBe("AI question");
  });

  it("applies set_meta without touching questions", () => {
    applyPollActions([{ kind: "set_meta", entity: "poll", title: "Customer survey" }]);
    expect(pollStore().form.title).toBe("Customer survey");
    expect(pollStore().form.questions).toHaveLength(1);
  });
});

describe("applyFormActions", () => {
  beforeEach(() => formStore().reset());

  it("fills the seeded blank starter question instead of appending past it", () => {
    expect(formStore().form.sections[0]!.questions).toHaveLength(1); // pristine seed

    applyFormActions([{ kind: "add_form_question", question: { type: "short_answer", title: "Your name?" } }]);

    const qs = formStore().form.sections[0]!.questions;
    expect(qs).toHaveLength(1); // filled in place, not appended
    expect(qs[0]!.title).toBe("Your name?");
    expect(qs[0]!.type).toBe("short_answer");
  });

  it("appends the second question below the now-filled first one", () => {
    applyFormActions([{ kind: "add_form_question", question: { type: "short_answer", title: "Q1" } }]);
    applyFormActions([{ kind: "add_form_question", question: { type: "short_answer", title: "Q2" } }]);

    const qs = formStore().form.sections[0]!.questions;
    expect(qs).toHaveLength(2);
    expect(qs.map((q) => q.title)).toEqual(["Q1", "Q2"]);
  });

  it("does not overwrite a question the user has already started filling in", () => {
    const sectionId = formStore().form.sections[0]!.id;
    const id = formStore().form.sections[0]!.questions[0]!.id;
    formStore().updateQuestion(sectionId, id, { title: "User's own question" });

    applyFormActions([{ kind: "add_form_question", question: { type: "short_answer", title: "AI question" } }]);

    const qs = formStore().form.sections[0]!.questions;
    expect(qs).toHaveLength(2);
    expect(qs[0]!.title).toBe("User's own question");
    expect(qs[1]!.title).toBe("AI question");
  });

  it("applies set_meta without touching questions", () => {
    applyFormActions([{ kind: "set_meta", entity: "form", title: "Feedback form" }]);
    expect(formStore().form.title).toBe("Feedback form");
    expect(formStore().form.sections[0]!.questions).toHaveLength(1);
  });
});
