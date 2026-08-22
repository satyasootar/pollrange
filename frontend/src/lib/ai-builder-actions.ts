import { v4 as uuidv4 } from "uuid";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { useFormBuilderStore, makeQuestion } from "@/store/use-form-builder-store";
import { newObjectId } from "@/lib/utils";
import type { AiAction, BuilderQuestion, BuilderFormQuestion } from "@/types";

/** The default seeded question (and any question a user left untouched) has no text or option text. */
function isBlankPollQuestion(q: BuilderQuestion): boolean {
  return !q.text.trim() && q.options.every((o) => !o.text.trim());
}

/** Apply AI builder actions to the poll store — one question at a time, live. */
export function applyPollActions(actions: AiAction[]) {
  const s = usePollBuilderStore.getState();
  const questions = [...s.form.questions];
  const meta: { title?: string; description?: string } = {};
  let added = false;
  for (const a of actions) {
    if (a.kind === "add_poll_question") {
      added = true;
      const newQuestion: BuilderQuestion = {
        id: uuidv4(),
        text: a.question.text,
        type: a.question.type,
        isMandatory: a.question.isMandatory ?? true,
        options: a.question.type === "open_ended" ? [] : (a.question.options ?? []).map((text) => ({ id: uuidv4(), text })),
      };
      // Fill an already-blank question (e.g. the seeded starter one) instead of
      // appending past it and leaving it empty.
      const blankIdx = questions.findIndex(isBlankPollQuestion);
      if (blankIdx !== -1) questions[blankIdx] = newQuestion;
      else questions.push(newQuestion);
    } else if (a.kind === "set_meta" && a.entity === "poll") {
      if (a.title !== undefined) meta.title = a.title;
      if (a.description !== undefined) meta.description = a.description;
    }
  }
  s.setForm({ ...meta, questions });
  if (added) s.setStep(2);
}

export const pollBuilderState = () => {
  const f = usePollBuilderStore.getState().form;
  return { title: f.title, questions: f.questions.map((q) => q.text).filter(Boolean) };
};

/** The default seeded question (and any question a user left untouched) has no title. */
function isBlankFormQuestion(q: BuilderFormQuestion): boolean {
  return !q.title.trim();
}

/** Apply AI builder actions to the form store — one question at a time, live. */
export function applyFormActions(actions: AiAction[]) {
  const st = useFormBuilderStore.getState();
  const sections = st.form.sections.map((sec) => ({ ...sec, questions: [...sec.questions] }));
  const target = sections[sections.length - 1];
  if (!target) return;
  const meta: { title?: string; description?: string } = {};
  let added = false;
  for (const a of actions) {
    if (a.kind === "add_form_question") {
      added = true;
      const q = makeQuestion(a.question.type);
      q.title = a.question.title;
      if (a.question.isRequired !== undefined) q.isRequired = a.question.isRequired;
      if (a.question.options?.length) q.options = a.question.options.map((text) => ({ id: newObjectId(), text }));
      if (a.question.rows?.length) q.rows = a.question.rows.map((label) => ({ id: newObjectId(), label }));
      if (a.question.columns?.length) q.columns = a.question.columns.map((label) => ({ id: newObjectId(), label }));
      if (a.question.scaleMin !== undefined) q.scaleMin = a.question.scaleMin;
      if (a.question.scaleMax !== undefined) q.scaleMax = a.question.scaleMax;
      // Fill an already-blank question (e.g. the seeded starter one) instead of
      // appending past it and leaving it empty.
      const blankIdx = target.questions.findIndex(isBlankFormQuestion);
      if (blankIdx !== -1) target.questions[blankIdx] = q;
      else target.questions.push(q);
    } else if (a.kind === "set_meta" && a.entity === "form") {
      if (a.title !== undefined) meta.title = a.title;
      if (a.description !== undefined) meta.description = a.description;
    }
  }
  st.setForm({ ...meta, sections });
  if (added) st.setStep(2);
}

export const formBuilderState = () => {
  const f = useFormBuilderStore.getState().form;
  return { title: f.title, questions: f.sections.flatMap((s) => s.questions.map((q) => q.title)).filter(Boolean) };
};
