import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { usePoll } from "@/hooks/use-polls";
import { StepSettings } from "@/components/poll-builder/step-settings";
import { StepQuestions } from "@/components/poll-builder/step-questions";
import { StepReviewEdit } from "@/components/poll-builder/step-review-edit";
import { slideInRight } from "@/lib/animations";

const STEPS = [
  { num: 1, label: "Settings" },
  { num: 2, label: "Questions" },
  { num: 3, label: "Save" },
];

export function EditPollPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const { data: poll, isLoading } = usePoll(pollId!);
  const { step, form, updateMeta } = usePollBuilderStore();

  // Prefill builder with existing poll
  useEffect(() => {
    if (poll) {
      if (poll.status !== "draft") {
        navigate(`/polls/${pollId}/analytics`, { replace: true });
        return;
      }
      updateMeta({
        title: poll.title,
        description: poll.description ?? "",
        expiresAt: poll.expiresAt.slice(0, 16),
        responseMode: poll.responseMode,
        settings: poll.settings,
      });
    }
  }, [poll]);

  if (isLoading) return null;

  if (!poll) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
        Poll not found.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-8 md:h-20">
        <h1 className="text-xl font-semibold">Edit Poll</h1>
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
                  step === s.num ? "font-medium" : "text-muted-foreground"
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
          <motion.div
            key={step}
            variants={slideInRight}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {step === 1 && <StepSettings />}
            {step === 2 && <StepQuestions />}
            {step === 3 && <StepReviewEdit pollId={pollId!} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
