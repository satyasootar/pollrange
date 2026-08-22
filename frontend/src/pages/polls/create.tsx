import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { StepSettings } from "@/components/poll-builder/step-settings";
import { StepQuestions } from "@/components/poll-builder/step-questions";
import { StepReview } from "@/components/poll-builder/step-review";
import { StepSuccess } from "@/components/poll-builder/step-success";
import { BuilderChatDock } from "@/components/ai/builder-chat-dock";
import { slideInRight } from "@/lib/animations";
import type { AiAction } from "@/types";

const STEPS = [
  { num: 1, label: "Settings" },
  { num: 2, label: "Questions" },
  { num: 3, label: "Review" },
];

/** Apply AI builder actions to the poll store — one question at a time, live. */
function applyPollActions(actions: AiAction[]) {
  const s = usePollBuilderStore.getState();
  const questions = [...s.form.questions];
  const meta: { title?: string; description?: string } = {};
  let added = false;
  for (const a of actions) {
    if (a.kind === "add_poll_question") {
      added = true;
      questions.push({
        id: uuidv4(),
        text: a.question.text,
        type: a.question.type,
        isMandatory: a.question.isMandatory ?? true,
        options: a.question.type === "open_ended" ? [] : (a.question.options ?? []).map((text) => ({ id: uuidv4(), text })),
      });
    } else if (a.kind === "set_meta" && a.entity === "poll") {
      if (a.title !== undefined) meta.title = a.title;
      if (a.description !== undefined) meta.description = a.description;
    }
  }
  s.setForm({ ...meta, questions });
  if (added) s.setStep(2);
}

const builderState = () => {
  const f = usePollBuilderStore.getState().form;
  return { title: f.title, questions: f.questions.map((q) => q.text).filter(Boolean) };
};

export function CreatePollPage() {
  const { step } = usePollBuilderStore();

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-8 md:h-20">
          <h1 className="text-xl font-semibold tracking-tight">Create Poll</h1>
          {step !== 4 && (
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
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={step} variants={slideInRight} initial="hidden" animate="visible" exit="exit" className="h-full">
              {step === 1 && <StepSettings />}
              {step === 2 && <StepQuestions />}
              {step === 3 && <StepReview />}
              {step === 4 && <StepSuccess />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* AI assistant — floating, closed by default (hidden on the success step) */}
      {step !== 4 && (
        <BuilderChatDock surface="poll-builder" getBuilderState={builderState} onActions={applyPollActions} />
      )}
    </div>
  );
}
