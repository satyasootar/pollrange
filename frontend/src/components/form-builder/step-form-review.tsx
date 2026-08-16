import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { useCreateForm } from "@/hooks/use-forms";
import { FormPreview } from "./form-preview";
import { formatDatetime } from "@/lib/utils";

export function StepFormReview() {
  const { form, prevStep, setSuccessData } = useFormBuilderStore();
  const createForm = useCreateForm();
  const totalQuestions = form.sections.reduce((n, s) => n + s.questions.length, 0);

  const handlePublish = () => {
    createForm.mutate(form, {
      onSuccess: (res) => {
        const created = res.data.data;
        setSuccessData({ formId: created._id, shareToken: created.shareToken });
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Review & Publish</h2>
        <p className="text-sm text-muted-foreground">Check everything before going live.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2 border border-border p-5">
          <h3 className="text-base font-semibold">{form.title || "Untitled form"}</h3>
          {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
          <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
            <span className="border border-border px-2 py-0.5 capitalize">{form.responseMode}</span>
            {form.isQuiz && <span className="border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">Quiz</span>}
            <span className="border border-border px-2 py-0.5">Expires: {formatDatetime(form.expiresAt)}</span>
            <span className="border border-border px-2 py-0.5">{totalQuestions} question{totalQuestions !== 1 ? "s" : ""}</span>
            <span className="border border-border px-2 py-0.5">{form.sections.length} section{form.sections.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preview — how respondents will see this form
          </p>
          <FormPreview form={form} />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          ← Edit Questions
        </Button>
        <Button onClick={handlePublish} disabled={createForm.isPending} className="gap-2">
          <Send className="h-4 w-4" />
          {createForm.isPending ? "Creating…" : "Publish Form"}
        </Button>
      </div>
    </div>
  );
}
