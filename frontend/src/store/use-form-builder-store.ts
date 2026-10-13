import { create } from "zustand";
import { newObjectId } from "@/lib/utils";
import type {
  BuilderFormOption,
  BuilderFormQuestion,
  BuilderFormSection,
  FormBuilderForm,
  FormQuestionType,
  FormSettings,
  GridItem,
} from "@/types";

function makeOption(text = ""): BuilderFormOption {
  return { id: newObjectId(), text };
}

function makeGridItem(label = ""): GridItem {
  return { id: newObjectId(), label };
}

/** Sensible per-type defaults when creating a question or switching its type. */
function typeDefaults(type: FormQuestionType): Partial<BuilderFormQuestion> {
  switch (type) {
    case "multiple_choice":
    case "checkboxes":
    case "dropdown":
      return { options: [makeOption("Option 1")] };
    case "linear_scale":
      return { scaleMin: 1, scaleMax: 5, options: [] };
    case "rating":
      return { scaleMin: 1, scaleMax: 5, options: [] };
    case "multiple_choice_grid":
    case "checkbox_grid":
      return { rows: [makeGridItem("Row 1")], columns: [makeGridItem("Column 1")], options: [] };
    case "file_upload":
      return { fileConfig: { maxFiles: 1, maxSizeMb: 10, allowedTypes: [] }, options: [] };
    default:
      return { options: [] };
  }
}

export function makeQuestion(type: FormQuestionType = "short_answer"): BuilderFormQuestion {
  return {
    id: newObjectId(),
    type,
    title: "",
    isRequired: false,
    options: [],
    ...typeDefaults(type),
  } as BuilderFormQuestion;
}

function makeSection(): BuilderFormSection {
  return { id: newObjectId(), questions: [makeQuestion()] };
}

const defaultSettings: FormBuilderForm["settings"] = {
  collectEmail: false,
  limitOneResponse: false,
  allowResponseEdit: false,
  showProgressBar: true,
  shuffleQuestions: false,
  releaseScoreImmediately: true,
  confirmationMessage: "Your response has been recorded.",
};

function defaultForm(): FormBuilderForm {
  return {
    title: "",
    description: "",
    slug: "",
    branding: { useKit: true },
    isQuiz: false,
    expiresAt: "",
    responseMode: "anonymous",
    settings: { ...defaultSettings },
    sections: [makeSection()],
  };
}

interface FormBuilderState {
  step: 1 | 2 | 3;
  form: FormBuilderForm;
  successData: { formId: string; shareToken: string } | null;
  setStep: (step: 1 | 2 | 3) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSuccessData: (data: { formId: string; shareToken: string } | null) => void;
  updateMeta: (patch: Partial<Omit<FormBuilderForm, "sections" | "settings">>) => void;
  updateSettings: (patch: Partial<FormSettings>) => void;
  setForm: (form: Partial<FormBuilderForm>) => void;
  // sections
  addSection: () => void;
  removeSection: (sectionId: string) => void;
  updateSection: (sectionId: string, patch: Partial<Omit<BuilderFormSection, "id" | "questions">>) => void;
  reorderSections: (from: number, to: number) => void;
  // questions
  addQuestion: (sectionId: string, type?: FormQuestionType) => void;
  duplicateQuestion: (sectionId: string, questionId: string) => void;
  removeQuestion: (sectionId: string, questionId: string) => void;
  updateQuestion: (sectionId: string, questionId: string, patch: Partial<BuilderFormQuestion>) => void;
  changeQuestionType: (sectionId: string, questionId: string, type: FormQuestionType) => void;
  reorderQuestions: (sectionId: string, questions: BuilderFormQuestion[]) => void;
  // options
  addOption: (sectionId: string, questionId: string) => void;
  removeOption: (sectionId: string, questionId: string, optionId: string) => void;
  updateOption: (sectionId: string, questionId: string, optionId: string, text: string, amount?: number) => void;
  reset: () => void;
}

/** Immutably map over a question inside a section. */
function patchQuestion(
  form: FormBuilderForm,
  sectionId: string,
  questionId: string,
  fn: (q: BuilderFormQuestion) => BuilderFormQuestion
): FormBuilderForm {
  return {
    ...form,
    sections: form.sections.map((s) =>
      s.id === sectionId
        ? { ...s, questions: s.questions.map((q) => (q.id === questionId ? fn(q) : q)) }
        : s
    ),
  };
}

export const useFormBuilderStore = create<FormBuilderState>()((set) => ({
  step: 1,
  form: defaultForm(),
  successData: null,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(3, s.step + 1) as 1 | 2 | 3 })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) as 1 | 2 | 3 })),
  setSuccessData: (successData) => set({ successData }),

  updateMeta: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
  updateSettings: (patch) =>
    set((s) => ({ form: { ...s.form, settings: { ...s.form.settings, ...patch } } })),
  setForm: (form) => set((s) => ({ form: { ...s.form, ...form } })),

  addSection: () =>
    set((s) => ({ form: { ...s.form, sections: [...s.form.sections, makeSection()] } })),

  removeSection: (sectionId) =>
    set((s) => ({
      form: {
        ...s.form,
        sections:
          s.form.sections.length > 1
            ? s.form.sections.filter((sec) => sec.id !== sectionId)
            : s.form.sections,
      },
    })),

  updateSection: (sectionId, patch) =>
    set((s) => ({
      form: {
        ...s.form,
        sections: s.form.sections.map((sec) => (sec.id === sectionId ? { ...sec, ...patch } : sec)),
      },
    })),

  reorderSections: (from, to) =>
    set((s) => {
      const sections = [...s.form.sections];
      const [moved] = sections.splice(from, 1);
      if (moved) sections.splice(to, 0, moved);
      return { form: { ...s.form, sections } };
    }),

  addQuestion: (sectionId, type = "short_answer") =>
    set((s) => ({
      form: {
        ...s.form,
        sections: s.form.sections.map((sec) =>
          sec.id === sectionId ? { ...sec, questions: [...sec.questions, makeQuestion(type)] } : sec
        ),
      },
    })),

  duplicateQuestion: (sectionId, questionId) =>
    set((s) => ({
      form: {
        ...s.form,
        sections: s.form.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const idx = sec.questions.findIndex((q) => q.id === questionId);
          if (idx === -1) return sec;
          const orig = sec.questions[idx]!;
          const copy: BuilderFormQuestion = {
            ...orig,
            id: newObjectId(),
            options: orig.options.map((o) => ({ ...o, id: newObjectId() })),
            // Deep-copy grid arrays so the duplicate doesn't share references with the original.
            rows: orig.rows?.map((r) => ({ ...r, id: newObjectId() })),
            columns: orig.columns?.map((c) => ({ ...c, id: newObjectId() })),
          };
          const questions = [...sec.questions];
          questions.splice(idx + 1, 0, copy);
          return { ...sec, questions };
        }),
      },
    })),

  removeQuestion: (sectionId, questionId) =>
    set((s) => ({
      form: {
        ...s.form,
        sections: s.form.sections.map((sec) =>
          sec.id === sectionId
            ? { ...sec, questions: sec.questions.filter((q) => q.id !== questionId) }
            : sec
        ),
      },
    })),

  updateQuestion: (sectionId, questionId, patch) =>
    set((s) => ({ form: patchQuestion(s.form, sectionId, questionId, (q) => ({ ...q, ...patch })) })),

  changeQuestionType: (sectionId, questionId, type) =>
    set((s) => ({
      form: patchQuestion(s.form, sectionId, questionId, (q) => ({
        ...q,
        type,
        // clear type-specific fields then apply the new type's defaults
        options: [],
        scaleMin: undefined,
        scaleMax: undefined,
        rows: undefined,
        columns: undefined,
        fileConfig: undefined,
        validation: undefined,
        optionNavigation: undefined,
        payment: undefined,
        ...typeDefaults(type),
      })),
    })),

  reorderQuestions: (sectionId, questions) =>
    set((s) => ({
      form: {
        ...s.form,
        sections: s.form.sections.map((sec) => (sec.id === sectionId ? { ...sec, questions } : sec)),
      },
    })),

  addOption: (sectionId, questionId) =>
    set((s) => ({
      form: patchQuestion(s.form, sectionId, questionId, (q) =>
        q.options.length < 20
          ? { ...q, options: [...q.options, makeOption(`Option ${q.options.length + 1}`)] }
          : q
      ),
    })),

  removeOption: (sectionId, questionId, optionId) =>
    set((s) => ({
      form: patchQuestion(s.form, sectionId, questionId, (q) => ({
        ...q,
        options: q.options.filter((o) => o.id !== optionId),
      })),
    })),

  updateOption: (sectionId, questionId, optionId, text, amount) =>
    set((s) => ({
      form: patchQuestion(s.form, sectionId, questionId, (q) => ({
        ...q,
        options: q.options.map((o) => (o.id === optionId ? { ...o, text, ...(amount === undefined ? {} : { amount }) } : o)),
      })),
    })),

  reset: () => set({ step: 1, form: defaultForm(), successData: null }),
}));
