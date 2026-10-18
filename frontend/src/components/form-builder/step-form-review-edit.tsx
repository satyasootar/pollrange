import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { useUpdateForm } from "@/hooks/use-forms";
import { FormPreview } from "./form-preview";

export function StepFormReviewEdit({ formId }: { formId: string }) {
  const { form, prevStep, reset } = useFormBuilderStore();
  const updateForm = useUpdateForm(formId);
  const navigate = useNavigate();

  const handleSave = () => {
    updateForm.mutate(form, {
      onSuccess: () => {
        reset();
        navigate(`/forms/${formId}/analytics`);
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Review Changes</h2>
        <p className="text-sm text-muted-foreground">Verify your changes before saving.</p>
      </div>

      <div className="space-y-4">
        <div className="border border-border p-5">
          <h3 className="text-base font-semibold">{form.title}</h3>
          {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Preview: how respondents will see this form
        </p>
        <FormPreview form={form} />
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          ← Edit Questions
        </Button>
        <Button onClick={handleSave} disabled={updateForm.isPending}>
          {updateForm.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
