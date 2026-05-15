import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { BuilderQuestion, BuilderOption, PollBuilderForm } from "@/types";

function makeOption(text = ""): BuilderOption {
  return { id: uuidv4(), text };
}

function makeQuestion(): BuilderQuestion {
  return {
    id: uuidv4(),
    text: "",
    type: "single_choice",
    isMandatory: true,
    options: [makeOption(), makeOption()],
  };
}

interface PollBuilderState {
  step: 1 | 2 | 3 | 4;
  form: PollBuilderForm;
  successData: { pollId: string; shareToken: string } | null;
  setStep: (step: 1 | 2 | 3 | 4) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSuccessData: (data: { pollId: string; shareToken: string } | null) => void;
  updateMeta: (patch: Partial<Omit<PollBuilderForm, "questions">>) => void;
  addQuestion: () => void;
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, patch: Partial<BuilderQuestion>) => void;
  addOption: (questionId: string) => void;
  removeOption: (questionId: string, optionId: string) => void;
  updateOption: (questionId: string, optionId: string, text: string) => void;
  reorderQuestions: (from: number, to: number) => void;
  reset: () => void;
}

const defaultForm: PollBuilderForm = {
  title: "",
  description: "",
  expiresAt: "",
  responseMode: "anonymous",
  settings: {
    showProgressBar: true,
    randomizeQuestions: false,
    randomizeOptions: false,
  },
  questions: [makeQuestion()],
};

export const usePollBuilderStore = create<PollBuilderState>()((set) => ({
  step: 1,
  form: { ...defaultForm, questions: [makeQuestion()] },
  successData: null,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(4, s.step + 1) as 1 | 2 | 3 | 4 })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) as 1 | 2 | 3 | 4 })),
  setSuccessData: (successData) => set({ successData }),

  updateMeta: (patch) =>
    set((s) => ({ form: { ...s.form, ...patch } })),

  addQuestion: () =>
    set((s) => ({
      form: { ...s.form, questions: [...s.form.questions, makeQuestion()] },
    })),

  removeQuestion: (id) =>
    set((s) => ({
      form: {
        ...s.form,
        questions: s.form.questions.filter((q) => q.id !== id),
      },
    })),

  updateQuestion: (id, patch) =>
    set((s) => ({
      form: {
        ...s.form,
        questions: s.form.questions.map((q) =>
          q.id === id ? { ...q, ...patch } : q
        ),
      },
    })),

  addOption: (questionId) =>
    set((s) => ({
      form: {
        ...s.form,
        questions: s.form.questions.map((q) =>
          q.id === questionId && q.options.length < 10
            ? { ...q, options: [...q.options, makeOption()] }
            : q
        ),
      },
    })),

  removeOption: (questionId, optionId) =>
    set((s) => ({
      form: {
        ...s.form,
        questions: s.form.questions.map((q) =>
          q.id === questionId
            ? { ...q, options: q.options.filter((o) => o.id !== optionId) }
            : q
        ),
      },
    })),

  updateOption: (questionId, optionId, text) =>
    set((s) => ({
      form: {
        ...s.form,
        questions: s.form.questions.map((q) =>
          q.id === questionId
            ? {
                ...q,
                options: q.options.map((o) =>
                  o.id === optionId ? { ...o, text } : o
                ),
              }
            : q
        ),
      },
    })),

  reorderQuestions: (from, to) =>
    set((s) => {
      const qs = [...s.form.questions];
      const [moved] = qs.splice(from, 1);
      qs.splice(to, 0, moved);
      return { form: { ...s.form, questions: qs } };
    }),

  reset: () =>
    set({ step: 1, form: { ...defaultForm, questions: [makeQuestion()] }, successData: null }),
}));
