import { newObjectId } from "@/lib/utils";
import type {
  Form,
  FormBuilderForm,
  BuilderFormQuestion,
  BuilderFormSection,
  FormSection,
  FormQuestion,
  GridItem,
} from "@/types";

/** Trim grid item labels and drop empties — respondents must never get empty/blank rows or columns. */
export function gridLabels(items?: GridItem[]): string[] | undefined {
  const labels = (items ?? []).map((i) => i.label.trim()).filter(Boolean);
  return labels.length ? labels : undefined;
}

/** Maps a persisted Form entity into the builder's editable shape (ids preserved). */
export function formEntityToBuilder(form: Form): FormBuilderForm {
  const sections: BuilderFormSection[] = [...form.sections]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s._id,
      title: s.title,
      description: s.description,
      navigation: s.navigation,
      questions: [...s.questions]
        .sort((a, b) => a.order - b.order)
        .map<BuilderFormQuestion>((q) => ({
          id: q._id,
          type: q.type,
          title: q.title,
          description: q.description,
          isRequired: q.isRequired,
          options: (q.options ?? []).map((o) => ({ id: o._id, text: o.text })),
          optionNavigation: q.optionNavigation,
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
          scaleMinLabel: q.scaleMinLabel,
          scaleMaxLabel: q.scaleMaxLabel,
          rows: q.rows?.map((label) => ({ id: newObjectId(), label })),
          columns: q.columns?.map((label) => ({ id: newObjectId(), label })),
          fileConfig: q.fileConfig,
          validation: q.validation,
          points: q.points,
          answerKey: q.answerKey,
        })),
    }));

  return {
    title: form.title,
    description: form.description ?? "",
    coverImageUrl: form.coverImageUrl,
    isQuiz: form.isQuiz,
    expiresAt: form.expiresAt ? form.expiresAt.slice(0, 16) : "",
    responseMode: form.responseMode,
    settings: {
      collectEmail: form.settings.collectEmail,
      limitOneResponse: form.settings.limitOneResponse,
      allowResponseEdit: form.settings.allowResponseEdit,
      showProgressBar: form.settings.showProgressBar,
      shuffleQuestions: form.settings.shuffleQuestions,
      releaseScoreImmediately: form.settings.releaseScoreImmediately,
      confirmationMessage: form.settings.confirmationMessage ?? "Your response has been recorded.",
    },
    sections,
  };
}

export interface PreviewForm {
  title: string;
  description: string;
  coverImageUrl?: string;
  isQuiz: boolean;
  sections: FormSection[];
}

/**
 * Maps the builder's editable form into the respondent-facing entity shape so the
 * Review step can render an exact WYSIWYG preview via the public QuestionRenderer.
 */
export function builderToPreviewForm(form: FormBuilderForm): PreviewForm {
  const sections: FormSection[] = form.sections.map((s, si) => ({
    _id: s.id,
    title: s.title,
    description: s.description,
    order: si,
    navigation: s.navigation,
    questions: s.questions.map<FormQuestion>((q, qi) => ({
      _id: q.id,
      order: qi,
      type: q.type,
      title: q.title,
      description: q.description,
      isRequired: q.isRequired,
      options: q.options.map((o, oi) => ({ _id: o.id, text: o.text, order: oi })),
      optionNavigation: q.optionNavigation,
      scaleMin: q.scaleMin,
      scaleMax: q.scaleMax,
      scaleMinLabel: q.scaleMinLabel,
      scaleMaxLabel: q.scaleMaxLabel,
      rows: gridLabels(q.rows),
      columns: gridLabels(q.columns),
      fileConfig: q.fileConfig,
      validation: q.validation,
      points: q.points,
      answerKey: q.answerKey,
    })),
  }));

  return {
    title: form.title,
    description: form.description,
    coverImageUrl: form.coverImageUrl,
    isQuiz: form.isQuiz,
    sections,
  };
}
