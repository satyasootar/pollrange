import { Reorder, useDragControls } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { FormQuestionEditor } from "./form-question-editor";
import { CHOICE_TYPES } from "./question-types";
import { paymentSetupError } from "@/lib/upi-payment";
import type { BuilderFormQuestion, BuilderFormSection } from "@/types";
import { toast } from "sonner";

function DraggableQuestion({
  sectionId,
  question,
  index,
}: {
  sectionId: string;
  question: BuilderFormQuestion;
  index: number;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={question}
      dragListener={false}
      dragControls={controls}
      className="list-none"
    >
      <FormQuestionEditor
        sectionId={sectionId}
        question={question}
        index={index}
        onGripPointerDown={(e) => controls.start(e)}
      />
    </Reorder.Item>
  );
}

function SectionEditor({ section, index, total }: { section: BuilderFormSection; index: number; total: number }) {
  const { form, updateSection, removeSection, addQuestion, reorderQuestions } = useFormBuilderStore();
  const showSectionChrome = total > 1;

  // Branching is available when there's more than one section and this isn't the last.
  const branchQuestion = section.questions.find((q) => CHOICE_TYPES.includes(q.type));
  const canBranch = total > 1 && branchQuestion;

  return (
    <div className="space-y-4">
      {showSectionChrome && (
        <div className="border border-border bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Section {index + 1} of {total}
            </span>
            {total > 1 && (
              <button
                type="button"
                onClick={() => removeSection(section.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <Input
            value={section.title ?? ""}
            placeholder="Section title"
            onChange={(e) => updateSection(section.id, { title: e.target.value })}
            className="mb-2"
          />
          <Input
            value={section.description ?? ""}
            placeholder="Section description (optional)"
            onChange={(e) => updateSection(section.id, { description: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      )}

      <Reorder.Group
        axis="y"
        values={section.questions}
        onReorder={(next) => reorderQuestions(section.id, next as BuilderFormQuestion[])}
        className="space-y-4"
      >
        {section.questions.map((q, i) => (
          <DraggableQuestion key={q.id} sectionId={section.id} question={q} index={i} />
        ))}
      </Reorder.Group>

      <button
        type="button"
        onClick={() => addQuestion(section.id)}
        className="flex w-full items-center justify-center gap-2 border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Add question
      </button>

      {/* Section navigation (branching) */}
      {total > 1 && (
        <div className="border border-border p-3 text-xs">
          <span className="mr-2 text-muted-foreground">After this section:</span>
          <select
            value={section.navigation?.type ?? (index === total - 1 ? "submit" : "next")}
            onChange={(e) =>
              updateSection(section.id, {
                navigation: {
                  type: e.target.value as "next" | "submit" | "byAnswer",
                  questionId: branchQuestion?.id,
                },
              })
            }
            className="border border-border bg-background px-2 py-1"
          >
            <option value="next">Continue to next section</option>
            <option value="submit">Submit form</option>
            {canBranch && <option value="byAnswer">Go to section based on answer</option>}
          </select>

          {section.navigation?.type === "byAnswer" && branchQuestion && (
            <div className="mt-3 space-y-2">
              <p className="text-muted-foreground">Based on “{branchQuestion.title || "(untitled)"}”:</p>
              {branchQuestion.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="w-40 truncate">{opt.text || "Option"}</span>
                  <span className="text-muted-foreground">→</span>
                  <select
                    value={branchQuestion.optionNavigation?.[opt.id] ?? ""}
                    onChange={(e) =>
                      useFormBuilderStore.getState().updateQuestion(section.id, branchQuestion.id, {
                        optionNavigation: {
                          ...branchQuestion.optionNavigation,
                          [opt.id]: e.target.value,
                        },
                      })
                    }
                    className="border border-border bg-background px-2 py-1"
                  >
                    <option value="">Next section</option>
                    {form.sections.map((s, si) => (
                      <option key={s.id} value={s.id} disabled={s.id === section.id}>
                        {s.title || `Section ${si + 1}`}
                      </option>
                    ))}
                    <option value="submit">Submit form</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StepFormQuestions() {
  const { form, addSection, nextStep, prevStep } = useFormBuilderStore();

  const handleNext = () => {
    const allQuestions = form.sections.flatMap((s) => s.questions);
    if (allQuestions.length === 0) {
      toast.error("Add at least one question.");
      return;
    }
    const hasEmpty = allQuestions.some(
      (q) =>
        !q.title.trim() ||
        (CHOICE_TYPES.includes(q.type) && q.options.some((o) => !o.text.trim()))
    );
    if (hasEmpty) {
      toast.error("Fill in every question title and option before continuing.");
      return;
    }
    const paymentQuestions = allQuestions.filter((q) => q.payment?.enabled);
    // Backend bills only the first payment question; keep it to one so totals never silently drop.
    if (paymentQuestions.length > 1) {
      toast.error("Only one question per form can collect payment. Turn it off on the others.");
      return;
    }
    const paymentError = paymentQuestions.map(paymentSetupError).find(Boolean);
    if (paymentError) {
      toast.error(paymentError);
      return;
    }
    nextStep();
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Build Questions</h2>
        <p className="text-sm text-muted-foreground">
          Add questions, pick their type, and drag to reorder. Add sections for multi-page forms.
        </p>
      </div>

      <div className="space-y-8">
        {form.sections.map((section, i) => (
          <SectionEditor key={section.id} section={section} index={i} total={form.sections.length} />
        ))}
      </div>

      <button
        type="button"
        onClick={addSection}
        className="mt-6 flex w-full items-center justify-center gap-2 border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Add section
      </button>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          ← Back
        </Button>
        <Button onClick={handleNext}>Review Form →</Button>
      </div>
    </div>
  );
}
