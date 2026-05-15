import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicPoll, useSubmitResponse } from "@/hooks/use-public-poll";
import { fadeUp, stagger, pageTransition } from "@/lib/animations";
import type { AnswerPayload } from "@/types";
import { timeUntilExpiry } from "@/lib/utils";

export function PublicPollPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { data: poll, isLoading, error } = usePublicPoll(shareToken!);
  const submitResponse = useSubmitResponse(poll?.pollId || (poll as any)?._id || "");

  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [submitted, setSubmitted] = useState(false);

  // Redirect if published
  useEffect(() => {
    if (poll?.status === "published") {
      navigate(`/p/${shareToken}/results`, { replace: true });
    }
  }, [poll?.status, shareToken, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !poll) {
    return <PollErrorState message="Poll not found." />;
  }

  if (poll.status === "closed" || poll.status === "expired") {
    return <PollClosedState />;
  }

  if (poll.alreadyResponded) {
    return <AlreadyRespondedState />;
  }

  if (submitted) {
    return (
      <ThankYouState
        isPublished={poll.status === "published"}
        shareToken={shareToken!}
        totalResponses={poll.totalResponses}
      />
    );
  }

  const questions = useMemo(() => {
    if (!poll?.questions) return [];
    
    // First, map the questions to ensure we have consistent IDs and randomized options if needed
    let processedQuestions = poll.questions.map(q => {
      const qId = q.questionId || (q as any)._id;
      let opts = q.options.map(opt => ({
        ...opt,
        optionId: opt.optionId || (opt as any)._id
      }));

      if (poll.settings.randomizeOptions) {
        opts = [...opts].sort(() => Math.random() - 0.5);
      }

      return { ...q, questionId: qId, options: opts };
    });

    // Then, randomize the questions themselves if needed
    if (poll.settings.randomizeQuestions) {
      processedQuestions = [...processedQuestions].sort(() => Math.random() - 0.5);
    }

    return processedQuestions;
  }, [poll]);

  const answeredMandatory = questions
    .filter((q) => q.isMandatory)
    .every((q) => answers[q.questionId] !== undefined);

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    const pollId = poll?.pollId || (poll as any)?._id;
    const payload: AnswerPayload[] = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: answers[q.questionId] ?? null,
    }));

    submitResponse.mutate(payload, {
      onSuccess: () => setSubmitted(true),
    });
  };

  const answeredCount = Object.keys(answers).length;
  const totalRequired = questions.filter((q) => q.isMandatory).length;

  return (
    <motion.div
      className="min-h-screen bg-background py-12 px-4"
      variants={pageTransition}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto max-w-xl">
        {/* Poll header */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {poll.totalResponses} response{poll.totalResponses !== 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Closes {timeUntilExpiry(poll.expiresAt)}
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight">{poll.title}</h1>
          {poll.description && (
            <p className="mt-2 text-sm text-muted-foreground">{poll.description}</p>
          )}
          {poll.settings.showProgressBar && (
            <div className="mt-4 h-1 w-full bg-border">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}
        </motion.div>

        {/* Questions */}
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          {questions.map((q) => {
            return (
              <motion.div
                key={q.questionId}
                variants={fadeUp}
                className="border border-border bg-card p-5"
              >
                <p className="mb-3 text-sm font-semibold">
                  {q.text}
                  {q.isMandatory && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </p>

                {q.options.length > 0 ? (
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const selected = answers[q.questionId] === opt.optionId;
                      return (
                        <button
                          key={opt.optionId}
                          onClick={() => handleSelect(q.questionId, opt.optionId)}
                          className={`flex w-full items-center gap-3 border p-3 text-left text-sm transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-foreground/30 hover:bg-muted"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              selected ? "border-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {selected && (
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </div>
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    className="w-full resize-none border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                    rows={3}
                    placeholder="Your answer…"
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.questionId]: e.target.value || null }))
                    }
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Submit */}
        <motion.div variants={fadeUp} className="mt-8 flex flex-col items-end gap-2">
          {!answeredMandatory && (
            <p className="text-xs text-muted-foreground">
              Answer all required questions to submit.
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!answeredMandatory || submitResponse.isPending}
            size="lg"
            className="w-full sm:w-auto"
          >
            {submitResponse.isPending ? "Submitting…" : "Submit Response"}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── State screens ─────────────────────────────────────────────────────────────
function ThankYouState({
  isPublished,
  shareToken,
  totalResponses,
}: {
  isPublished: boolean;
  shareToken: string;
  totalResponses: number;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="border border-border bg-card p-10 text-center max-w-sm w-full"
      >
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
        <h2 className="mb-2 text-xl font-bold">Thank you!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Your response has been recorded. You're among{" "}
          <strong>{totalResponses + 1}</strong> respondents.
        </p>
        {isPublished && (
          <Button onClick={() => navigate(`/p/${shareToken}/results`)}>
            View Results
          </Button>
        )}
      </motion.div>
    </div>
  );
}

function PollClosedState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="border border-border bg-card p-10 text-center max-w-sm w-full">
        <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-bold">Poll Expired</h2>
        <p className="text-sm text-muted-foreground">
          This poll is no longer accepting responses. The creator has not yet published the results.
        </p>
      </div>
    </div>
  );
}

function AlreadyRespondedState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="border border-border bg-card p-10 text-center max-w-sm w-full">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="mb-2 text-xl font-bold">Already Responded</h2>
        <p className="text-sm text-muted-foreground">
          You've already submitted a response to this poll.
        </p>
      </div>
    </div>
  );
}

function PollErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="border border-border bg-card p-10 text-center max-w-sm w-full">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-bold">Not Found</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
