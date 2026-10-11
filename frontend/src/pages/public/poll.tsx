import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicPoll, useSubmitResponse, usePollStatus } from "@/hooks/use-public-poll";
import { fadeUp, stagger, pageTransition } from "@/lib/animations";
import type { AnswerPayload, PublicPollQuestion } from "@/types";
import { timeUntilExpiry, shuffle } from "@/lib/utils";
import { useAuthStore } from "@/store/use-auth-store";
import { AuthGateDialog } from "@/components/auth/auth-gate-dialog";
import { PoweredBy } from "@/components/billing/powered-by";

// The backend returns Mongoose subdocuments, so ids arrive as `_id`; the typed
// `questionId`/`optionId` may be absent. Model both and normalize below.
type RawOption = { optionId?: string; _id?: string; text: string; order: number };
type RawQuestion = Omit<PublicPollQuestion, "options"> & { _id?: string; options: RawOption[] };

type ProcessedQuestion = Omit<PublicPollQuestion, "options"> & {
  options: (RawOption & { optionId: string })[];
};

type AnswerMap = Record<string, string | string[] | null>;

function buildAnswerPayload(questions: ProcessedQuestion[], ans: AnswerMap): AnswerPayload[] {
  return questions.map((q) => {
    const isSingle = q.type === "single_choice";
    const isMultiple = q.type === "multiple_choice";
    const answer = ans[q.questionId];

    return {
      questionId: q.questionId,
      selectedOptionId: isSingle ? (answer as string) : null,
      selectedOptionIds: isMultiple ? (answer as string[]) : [],
      textResponse: q.type === "open_ended" ? (answer as string) : null,
      skipped: !answer || (isMultiple && (answer as string[]).length === 0),
    };
  });
}

export function PublicPollPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { data: poll, isLoading, error } = usePublicPoll(shareToken!);
  const { data: statusData } = usePollStatus(shareToken!);
  const submitResponse = useSubmitResponse(poll?.pollId || "", shareToken!);

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const pendingKey = `kollects_pending_${shareToken}`;
  const resumedRef = useRef(false);

  const pollId = poll?.pollId ?? "";

  // Normalize ids and apply randomization. The shuffle is seeded by the stable pollId,
  // so the order is deterministic per poll and stays fixed across re-renders and
  // background refetches — it never reshuffles under the respondent while answering.
  const questions = useMemo<ProcessedQuestion[]>(() => {
    if (!poll?.questions) return [];

    let processedQuestions: ProcessedQuestion[] = (poll.questions as RawQuestion[]).map((q) => {
      const qId = q.questionId || q._id || "";
      let opts = q.options.map((opt) => ({
        ...opt,
        optionId: opt.optionId || opt._id || "",
      }));

      if (poll.settings.randomizeOptions) {
        opts = shuffle(opts, `${pollId}:${qId}`);
      }

      return { ...q, questionId: qId, options: opts };
    });

    if (poll.settings.randomizeQuestions) {
      processedQuestions = shuffle(processedQuestions, `${pollId}:questions`);
    }

    return processedQuestions;
  }, [poll, pollId]);

  // Redirect if published
  useEffect(() => {
    if (poll?.status === "published") {
      navigate(`/p/${shareToken}/results`, { replace: true });
    }
  }, [poll?.status, shareToken, navigate]);

  // Resume a submit that was interrupted by the Google auth redirect: if we
  // return logged in with stashed answers, restore them and submit once.
  useEffect(() => {
    if (resumedRef.current || !poll || !user) return;
    const raw = localStorage.getItem(pendingKey);
    if (!raw) return;
    resumedRef.current = true;
    localStorage.removeItem(pendingKey);
    try {
      const saved = JSON.parse(raw) as AnswerMap;
      submitResponse.mutate(buildAnswerPayload(questions, saved), {
        onSuccess: () => setSubmitted(true),
      });
    } catch {
      /* ignore corrupt pending data */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Use statusData if it's faster or more up-to-date than the main poll query
  const currentStatus = statusData?.status || poll?.status;
  const hasResponded = statusData?.alreadyResponded || poll?.alreadyResponded;

  if (error || !poll) {
    return <PollErrorState message="Poll not found." />;
  }

  if (currentStatus === "closed" || currentStatus === "expired") {
    return (
      <PollClosedState
        isResultsPublic={poll.isResultsPublic || poll.status === "published"}
        shareToken={shareToken!}
      />
    );
  }

  if (hasResponded) {
    return (
      <AlreadyRespondedState
        isResultsPublic={poll.isResultsPublic || poll.status === "published"}
        shareToken={shareToken!}
      />
    );
  }

  if (submitted) {
    return (
      <ThankYouState
        isResultsPublic={poll.isResultsPublic || poll.status === "published"}
        shareToken={shareToken!}
        totalResponses={poll.totalResponses}
      />
    );
  }

  const answeredMandatory = questions
    .filter((q) => q.isMandatory)
    .every((q) => {
      const ans = answers[q.questionId];
      if (q.type === "multiple_choice") {
        return Array.isArray(ans) && ans.length > 0;
      }
      return ans !== undefined && ans !== null && ans !== "";
    });

  const handleSelect = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers((prev) => {
      if (isMultiple) {
        const current = (prev[questionId] as string[]) || [];
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: optionId };
    });
  };

  const doSubmit = (ans: AnswerMap = answers) => {
    submitResponse.mutate(buildAnswerPayload(questions, ans), {
      onSuccess: () => setSubmitted(true),
    });
  };

  // Google auth is a full-page redirect, so stash the answers first; the resume
  // effect submits them when we come back logged in.
  const savePending = () => localStorage.setItem(pendingKey, JSON.stringify(answers));

  const handleSubmit = () => {
    // Authenticated polls require a logged-in respondent: gate on the auth modal,
    // then auto-submit once they're in.
    if (poll.responseMode === "authenticated" && !user) {
      setAuthOpen(true);
      return;
    }
    doSubmit();
  };

  const answeredCount = Object.keys(answers).length;

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
                      const isMultiple = q.type === "multiple_choice";
                      const selected = isMultiple 
                        ? (answers[q.questionId] as string[] || []).includes(opt.optionId)
                        : answers[q.questionId] === opt.optionId;
                      
                      return (
                        <button
                          key={opt.optionId}
                          onClick={() => handleSelect(q.questionId, opt.optionId, isMultiple)}
                          className={`flex w-full items-center gap-3 border p-3 text-left text-sm transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-foreground/30 hover:bg-muted"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors ${
                              isMultiple ? "rounded" : "rounded-full"
                            } border-2 ${
                              selected ? "border-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {selected && (
                              <div className={`h-2 w-2 ${isMultiple ? "rounded-sm" : "rounded-full"} bg-primary`} />
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
        <PoweredBy show={poll.showPoweredBy} />
      </div>

      <AuthGateDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthenticated={() => doSubmit()}
        googleRedirect={`/p/${shareToken}`}
        onBeforeGoogle={savePending}
      />
    </motion.div>
  );
}

// ─── State screens ─────────────────────────────────────────────────────────────
function ThankYouState({
  isResultsPublic,
  shareToken,
  totalResponses,
}: {
  isResultsPublic: boolean;
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
        {isResultsPublic && (
          <Button onClick={() => navigate(`/p/${shareToken}/results`)}>
            View Results
          </Button>
        )}
      </motion.div>
    </div>
  );
}

function PollClosedState({
  isResultsPublic,
  shareToken,
}: {
  isResultsPublic: boolean;
  shareToken: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full border border-border bg-card p-10 text-center shadow-sm"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <Clock className="h-8 w-8" />
        </div>
        <h2 className="mb-3 text-2xl font-bold tracking-tight">This poll has ended</h2>
        <p className="mb-8 text-muted-foreground leading-relaxed">
          The creator has closed this poll or the deadline has passed.
          {isResultsPublic ? " You can still view the results below." : " Results will be available once the creator publishes them."}
        </p>
        <div className="flex flex-col gap-3">
          {isResultsPublic && (
            <Button onClick={() => navigate(`/p/${shareToken}/results`)} className="w-full">
              View Results
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full font-medium"
            onClick={() => (window.location.href = "/")}
          >
            Create Your Own Poll
          </Button>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Kollects Public Gateway
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function AlreadyRespondedState({
  isResultsPublic,
  shareToken,
}: {
  isResultsPublic: boolean;
  shareToken: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="border border-border bg-card p-10 text-center max-w-sm w-full">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="mb-2 text-xl font-bold">Already Responded</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've already submitted a response to this poll.
        </p>
        {isResultsPublic && (
          <Button onClick={() => navigate(`/p/${shareToken}/results`)}>
            View Results
          </Button>
        )}
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
