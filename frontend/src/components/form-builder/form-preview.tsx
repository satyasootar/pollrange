import { useMemo, useState } from "react";
import { QuestionRenderer, type AnswerDraft } from "@/components/form-public/question-renderer";
import { builderToPreviewForm } from "@/lib/form-mappers";
import type { FormBuilderForm } from "@/types";

/**
 * Exact WYSIWYG preview of the form as respondents will see it — reuses the public
 * QuestionRenderer, rendered section-wise. Inputs are interactive (so you can try the
 * form) but nothing is submitted and file uploads are disabled.
 */
export function FormPreview({ form }: { form: FormBuilderForm }) {
  const preview = useMemo(() => builderToPreviewForm(form), [form]);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const multiSection = preview.sections.length > 1;

  return (
    <div className="space-y-8">
      {preview.sections.map((section, si) => (
        <div key={section._id} className="space-y-4">
          {(multiSection || section.title || section.description) && (
            <div className="border-l-2 border-primary pl-3">
              <h3 className="text-base font-semibold">{section.title || `Section ${si + 1}`}</h3>
              {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
            </div>
          )}
          {section.questions.map((q, qi) => (
            <div key={q._id} className="border border-border bg-card p-5">
              <p className="mb-1 text-sm font-semibold">
                {qi + 1}. {q.title || "(untitled)"}
                {q.isRequired && <span className="ml-1 text-destructive">*</span>}
                {preview.isQuiz && q.points ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({q.points} pts)</span>
                ) : null}
              </p>
              {q.description && <p className="mb-3 text-xs text-muted-foreground">{q.description}</p>}
              <div className="mt-3">
                <QuestionRenderer
                  formId=""
                  preview
                  question={q}
                  value={answers[q._id] ?? {}}
                  onChange={(patch) =>
                    setAnswers((prev) => {
                      const cur = prev[q._id] ?? {};
                      return { ...prev, [q._id]: typeof patch === "function" ? patch(cur) : { ...cur, ...patch } };
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
