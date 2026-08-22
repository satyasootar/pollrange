import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useFormBuilderStore, makeQuestion } from "@/store/use-form-builder-store";
import { StepFormSettings } from "@/components/form-builder/step-form-settings";
import { StepFormQuestions } from "@/components/form-builder/step-form-questions";
import { StepFormReview } from "@/components/form-builder/step-form-review";
import { StepFormSuccess } from "@/components/form-builder/step-form-success";
import { BuilderChatDock } from "@/components/ai/builder-chat-dock";
import { slideInRight } from "@/lib/animations";
import { newObjectId } from "@/lib/utils";
import type { AiAction } from "@/types";

const STEPS = [
  { num: 1, label: "Settings" },
  { num: 2, label: "Questions" },
  { num: 3, label: "Review" },
];

/** Apply AI builder actions to the form store — one question at a time, live. */
function applyFormActions(actions: AiAction[]) {
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
      target.questions.push(q);
    } else if (a.kind === "set_meta" && a.entity === "form") {
      if (a.title !== undefined) meta.title = a.title;
      if (a.description !== undefined) meta.description = a.description;
    }
  }
  st.setForm({ ...meta, sections });
  if (added) st.setStep(2);
}

const builderState = () => {
  const f = useFormBuilderStore.getState().form;
  return { title: f.title, questions: f.sections.flatMap((s) => s.questions.map((q) => q.title)).filter(Boolean) };
};

export function CreateFormPage() {
  const { step, successData, reset } = useFormBuilderStore();

  // Start a fresh builder whenever the create page mounts.
  useEffect(() => {
    reset();
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (successData) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <StepFormSuccess />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-8 md:h-20">
        <h1 className="text-xl font-semibold tracking-tight">Create Form</h1>
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center border text-xs font-semibold transition-colors ${
                  step > s.num
                    ? "border-primary bg-primary text-primary-foreground"
                    : step === s.num
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                }`}
              >
                {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span
                className={`ml-2 hidden text-sm sm:block ${
                  step === s.num ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="mx-3 h-px w-8 bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={step} variants={slideInRight} initial="hidden" animate="visible" exit="exit" className="h-full">
            {step === 1 && <StepFormSettings />}
            {step === 2 && <StepFormQuestions />}
            {step === 3 && <StepFormReview />}
          </motion.div>
        </AnimatePresence>
      </div>
      </div>

      {/* AI assistant — floating, closed by default */}
      <BuilderChatDock surface="form-builder" getBuilderState={builderState} onActions={applyFormActions} />
    </div>
  );
}
