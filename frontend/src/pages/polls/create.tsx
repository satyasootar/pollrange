import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { StepSettings } from "@/components/poll-builder/step-settings";
import { StepQuestions } from "@/components/poll-builder/step-questions";
import { StepReview } from "@/components/poll-builder/step-review";
import { StepSuccess } from "@/components/poll-builder/step-success";
import { BuilderChatDock } from "@/components/ai/builder-chat-dock";
import { slideInRight } from "@/lib/animations";
import { config } from "@/config/config";
import { applyPollActions, pollBuilderState } from "@/lib/ai-builder-actions";

const STEPS = [
  { num: 1, label: "Settings" },
  { num: 2, label: "Questions" },
  { num: 3, label: "Review" },
];

export function CreatePollPage() {
  const { step } = usePollBuilderStore();
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4 md:h-20 md:px-8 md:py-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 md:hidden">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">Create Poll</h1>
          </div>
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

      {/* AI assistant — floating, closed by default; only after Settings (step 1) is done */}
      {config.aiEnabled && step > 1 && step !== 4 && (
        <BuilderChatDock surface="poll-builder" getBuilderState={pollBuilderState} onActions={applyPollActions} />
      )}
    </div>
  );
}
