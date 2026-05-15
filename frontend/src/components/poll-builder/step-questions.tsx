import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { stagger, fadeUp } from "@/lib/animations";
import type { BuilderQuestion } from "@/types";
import { toast } from "sonner";

function QuestionCard({ q, index }: { q: BuilderQuestion; index: number }) {
  const {
    updateQuestion,
    removeQuestion,
    addOption,
    removeOption,
    updateOption,
  } = usePollBuilderStore();

  return (
    <motion.div
      layout
      variants={fadeUp}
      className="border border-border bg-card"
    >
      {/* Question header */}
      <div className="flex items-start gap-3 border-b border-border p-4">
        <GripVertical className="mt-1 h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-2">
            <span className="mt-2.5 text-xs font-semibold text-muted-foreground">
              Q{index + 1}
            </span>
            <Input
              value={q.text}
              placeholder="Type your question…"
              onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
              className="flex-1"
            />
          </div>
          {/* Type + mandatory */}
          <div className="flex items-center gap-4 pl-6">
            <select
              value={q.type}
              onChange={(e) =>
                updateQuestion(q.id, {
                  type: e.target.value as BuilderQuestion["type"],
                })
              }
              className="border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              <option value="single_choice">Single Choice</option>
              <option value="open_ended">Open Ended</option>
            </select>
            <div className="flex items-center gap-2">
              <Switch
                id={`mandatory-${q.id}`}
                checked={q.isMandatory}
                onCheckedChange={(v) => updateQuestion(q.id, { isMandatory: v })}
                className="scale-75"
              />
              <Label
                htmlFor={`mandatory-${q.id}`}
                className="cursor-pointer text-xs text-muted-foreground"
              >
                Mandatory
              </Label>
            </div>
          </div>
        </div>
        <button
          onClick={() => removeQuestion(q.id)}
          className="mt-1 p-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Options */}
      {q.type === "single_choice" && (
        <div className="space-y-2 p-4 pl-10">
          <AnimatePresence>
            {q.options.map((opt) => (
              <motion.div
                key={opt.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2"
              >
                <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40" />
                <Input
                  value={opt.text}
                  placeholder={`Option ${q.options.indexOf(opt) + 1}`}
                  onChange={(e) => updateOption(q.id, opt.id, e.target.value)}
                  className="h-8 text-sm"
                />
                {q.options.length > 2 && (
                  <button
                    onClick={() => removeOption(q.id, opt.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {q.options.length < 10 && (
            <button
              onClick={() => addOption(q.id)}
              className="flex items-center gap-1.5 pl-6 text-xs text-muted-foreground hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add option
            </button>
          )}
        </div>
      )}
      {q.type === "open_ended" && (
        <div className="p-4 pl-10">
          <div className="h-16 w-full border border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
            Text response field (rendered on poll form)
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function StepQuestions() {
  const { form, addQuestion, nextStep, prevStep } = usePollBuilderStore();

  const handleNext = () => {
    const hasEmpty = form.questions.some(
      (q) =>
        !q.text.trim() ||
        (q.type === "single_choice" &&
          q.options.some((o) => !o.text.trim()))
    );
    if (hasEmpty) {
      toast.error("Fill in all question and option text before continuing.");
      return;
    }
    if (form.questions.length === 0) {
      toast.error("Add at least one question.");
      return;
    }
    nextStep();
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Build Questions</h2>
        <p className="text-sm text-muted-foreground">
          Add up to 20 questions. Drag to reorder.
        </p>
      </div>

      <motion.div
        className="space-y-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {form.questions.map((q, i) => (
          <QuestionCard key={q.id} q={q} index={i} />
        ))}
      </motion.div>

      {form.questions.length < 20 && (
        <button
          onClick={addQuestion}
          className="mt-4 flex w-full items-center justify-center gap-2 border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" /> Add Question
        </button>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          ← Back
        </Button>
        <Button onClick={handleNext}>Review Poll →</Button>
      </div>
    </div>
  );
}
