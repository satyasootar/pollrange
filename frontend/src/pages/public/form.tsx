import { useState, useMemo, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, Loader2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublicForm, useSubmitFormResponse } from "@/hooks/use-public-form";
import { QuestionRenderer, type AnswerDraft } from "@/components/form-public/question-renderer";
import { PaymentDue } from "@/components/form-public/payment-due";
import { selectionError } from "@/lib/upi-payment";
import { fadeUp, stagger, pageTransition } from "@/lib/animations";
import { cn, formatCountdown, getOrCreateSessionToken, shuffle, timeUntilExpiry, toastApiError } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/use-auth-store";
import { AuthGateDialog } from "@/components/auth/auth-gate-dialog";
import { PoweredBy } from "@/components/billing/powered-by";
import { useBrandTheme } from "@/hooks/use-brand-theme";
import { BrandFooter, BrandHeader, BrandThankYou } from "@/components/brand/brand-chrome";
import { QuizResultScreen } from "@/components/quiz-results/quiz-result-screen";
import { useCountdown } from "@/hooks/use-countdown";
import type { FormQuestion, FormSection, FormAnswerPayload, PublicBrand, SubmitFormResult } from "@/types";

type AnswerMap = Record<string, AnswerDraft>;

function draftHasValue(d: AnswerDraft | undefined): boolean {
  if (!d) return false;
  return (
    (d.textValue != null && d.textValue.trim() !== "") ||
    d.numberValue != null ||
    (d.dateValue != null && d.dateValue !== "") ||
    (d.selectedOptionIds?.length ?? 0) > 0 ||
    d.scaleValue != null ||
    (d.gridValues?.some((g) => g.columns.length > 0) ?? false) ||
    (d.fileUrls?.length ?? 0) > 0
  );
}

function toAnswerPayload(q: FormQuestion, d: AnswerDraft | undefined): FormAnswerPayload {
  const skipped = !draftHasValue(d);
  return {
    questionId: q._id,
    textValue: d?.textValue ?? null,
    numberValue: d?.numberValue ?? null,
    dateValue: d?.dateValue ?? null,
    selectedOptionIds: d?.selectedOptionIds ?? [],
    scaleValue: d?.scaleValue ?? null,
    gridValues: d?.gridValues ?? [],
    fileUrls: d?.fileUrls ?? [],
    skipped,
  };
}

/** Builds the submit payload from the sections the respondent actually visited. */
function collectPayload(sections: FormSection[], visited: Set<string>, ans: AnswerMap): FormAnswerPayload[] {
  return sections
    .filter((s) => visited.has(s._id))
    .flatMap((s) => s.questions)
    .map((q) => toAnswerPayload(q, ans[q._id]));
}

export function PublicFormPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const sessionToken = useMemo(() => getOrCreateSessionToken(shareToken!), [shareToken]);
  const { data: form, isLoading, error } = usePublicForm(shareToken!, sessionToken);
  const submit = useSubmitFormResponse(form?.formId ?? "");
  const user = useAuthStore((s) => s.user);

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [sectionIndex, setSectionIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Quiz timer ran out mid-attempt: flushing the partial answers, or nothing to send.
  const [timeoutPhase, setTimeoutPhase] = useState<"submitting" | "ended" | null>(null);
  const [result, setResult] = useState<SubmitFormResult | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  // The sign-in gate opens either at submit (then submits) or on a file pick (then lets them pick again).
  const submitAfterAuth = useRef(true);
  const visitedRef = useRef<Set<string>>(new Set());
  const pendingKey = `kollects_form_pending_${shareToken}`;
  const resumedRef = useRef(false);

  const sections = useMemo<FormSection[]>(() => {
    if (!form) return [];
    const sorted = [...form.sections].sort((a, b) => a.order - b.order);
    if (form.settings.shuffleQuestions) {
      return sorted.map((s) => ({ ...s, questions: shuffle(s.questions, `${form.formId}:${s._id}`) }));
    }
    return sorted;
  }, [form]);

  const currentSection = sections[sectionIndex];
  useEffect(() => {
    if (currentSection) visitedRef.current.add(currentSection._id);
  }, [currentSection]);

  // Resume after Google auth redirect.
  useEffect(() => {
    if (resumedRef.current || !form || !user) return;
    const raw = localStorage.getItem(pendingKey);
    if (!raw) return;
    resumedRef.current = true;
    localStorage.removeItem(pendingKey);
    try {
      const saved = JSON.parse(raw) as { answers: AnswerMap; visited: string[] };
      saved.visited.forEach((id) => visitedRef.current.add(id));
      submit.mutate(
        { sessionToken, answers: collectPayload(sections, visitedRef.current, saved.answers), isComplete: true },
        {
          onSuccess: (res) => {
            setResult(res.data.data);
            setSubmitted(true);
          },
          onError: (err) => toastApiError(err),
        }
      );
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, user]);

  useBrandTheme(form?.brand, form?.title);

  // Sign-in forms take the name and email from the account; only open forms ask for them.
  const isOpenForm = form?.responseMode !== "authenticated";
  const askName = !!form?.isQuiz && isOpenForm && !user;
  const needsEmail = !!form?.settings.collectEmail && isOpenForm && !user;

  // Declared before the early returns: the quiz timer can call it from any render.
  const doSubmit = (ans: AnswerMap = answers, timedOut = false) => {
    if (!form) return;
    if (needsEmail && !email.trim()) {
      toast.error("Please provide your email address.");
      if (timedOut) setTimeoutPhase("ended");
      return;
    }
    submit.mutate(
      {
        sessionToken,
        respondentEmail: needsEmail ? email : undefined,
        respondentName: askName ? respondentName.trim() || undefined : undefined,
        ...(timedOut ? { timedOut: true } : {}),
        answers: collectPayload(sections, visitedRef.current, ans),
        isComplete: true,
      },
      {
        onSuccess: (res) => {
          setResult(res.data.data);
          setSubmitted(true);
        },
        onError: (err) => {
          toastApiError(err);
          if (timedOut) setTimeoutPhase("ended");
        },
      }
    );
  };

  // Time's up: submit whatever was answered (if anything, and if we're allowed to), else just end.
  const handleTimeUp = () => {
    if (!form || submitted || submit.isPending) return;
    const canSubmit =
      Object.values(answers).some(draftHasValue) && !(form.responseMode === "authenticated" && !user);
    setTimeoutPhase(canSubmit ? "submitting" : "ended");
    if (canSubmit) doSubmit(answers, true);
  };

  const timerRunning = !!form?.isQuiz && form.status === "active" && !form.alreadyResponded && !submitted;
  const remaining = useCountdown(timerRunning ? form?.expiresAt : undefined, form?.serverTime, handleTimeUp);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !form) return <FormStateScreen icon="error" title="Not found" message="This form doesn't exist." />;

  if (submitted && result?.payment) {
    return (
      <PaymentDue
        payment={result.payment}
        payeeName={form.title}
        confirmationMessage={form.settings.confirmationMessage || "Your response has been recorded."}
      />
    );
  }

  // Quizzes keep the same link for results: score, then the leaderboard once it's published.
  if (form.isQuiz && timeoutPhase === "submitting" && !submitted)
    return <FormStateScreen icon="clock" title="Time's up!" message="Submitting your answers…" brand={form.brand} />;
  if (form.isQuiz && (submitted || form.alreadyResponded || timeoutPhase === "ended" || form.status !== "active")) {
    return (
      <QuizResultScreen
        form={form}
        shareToken={shareToken!}
        sessionToken={sessionToken}
        confirmationMessage={submitted ? form.settings.confirmationMessage : undefined}
        timedOut={submitted && timeoutPhase !== null}
      />
    );
  }

  if (form.status !== "active")
    return <FormStateScreen icon="clock" title="This form has ended" message="The creator has closed this form or the deadline has passed." />;
  if (form.alreadyResponded)
    return <FormStateScreen icon="check" title="Already responded" message="You've already submitted a response to this form." />;
  if (submitted) {
    return (
      <FormStateScreen
        icon="check"
        title="Thank you!"
        message={form.settings.confirmationMessage || "Your response has been recorded."}
        brand={form.brand}
      />
    );
  }

  const allQuestions = sections.flatMap((s) => s.questions);

  // Which section comes next based on branching. Returns index or "submit".
  const computeNext = (): number | "submit" => {
    if (!currentSection) return "submit";
    const nav = currentSection.navigation;
    if (nav?.type === "submit") return "submit";
    if (nav?.type === "byAnswer") {
      const branchQ = currentSection.questions.find((q) => q._id === nav.questionId);
      const chosen = branchQ ? answers[branchQ._id]?.selectedOptionIds?.[0] : undefined;
      const target = chosen && branchQ?.optionNavigation?.[chosen];
      if (target === "submit") return "submit";
      if (target) {
        const idx = sections.findIndex((s) => s._id === target);
        if (idx >= 0) return idx;
      }
    }
    return sectionIndex + 1 >= sections.length ? "submit" : sectionIndex + 1;
  };

  const sectionValid = (): boolean => {
    if (!currentSection) return true;
    for (const q of currentSection.questions) {
      const d = answers[q._id];
      if (q.isRequired && !draftHasValue(d)) {
        toast.error(`Please answer: "${q.title}"`);
        return false;
      }
      const pickError = selectionError(q, d?.selectedOptionIds?.length ?? 0);
      if (pickError) {
        toast.error(pickError);
        return false;
      }
      if (q.validation?.kind && d?.textValue) {
        const r = q.validation;
        const v = d.textValue;
        if (r.kind === "length" && ((r.min != null && v.length < r.min) || (r.max != null && v.length > r.max))) {
          toast.error(r.message || "Answer failed validation");
          return false;
        }
        if (r.kind === "regex" && r.pattern && !new RegExp(r.pattern).test(v)) {
          toast.error(r.message || "Answer failed validation");
          return false;
        }
      }
    }
    return true;
  };

  const savePending = () =>
    localStorage.setItem(pendingKey, JSON.stringify({ answers, visited: [...visitedRef.current] }));

  const handleNextOrSubmit = () => {
    if (askName && history.length === 0 && !respondentName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (form.isQuiz && history.length === 0 && needsEmail && !email.trim()) {
      toast.error("Please provide your email address.");
      return;
    }
    if (!sectionValid()) return;
    const next = computeNext();
    if (next === "submit") {
      if (form.responseMode === "authenticated" && !user) {
        submitAfterAuth.current = true;
        setAuthOpen(true);
        return;
      }
      doSubmit();
    } else {
      setHistory((h) => [...h, sectionIndex]);
      setSectionIndex(next);
    }
  };

  const handleBack = () => {
    setHistory((h) => {
      const prev = h[h.length - 1];
      if (prev !== undefined) setSectionIndex(prev);
      return h.slice(0, -1);
    });
  };

  const answeredCount = allQuestions.filter((q) => draftHasValue(answers[q._id])).length;
  const isLastStep = computeNext() === "submit";
  const multiSection = sections.length > 1;
  // Files upload in the background — block Next/Submit until every upload settles.
  const anyUploading = Object.values(answers).some((d) => d.filePreviews?.some((f) => f.status === "uploading"));
  const busy = anyUploading || submit.isPending;

  return (
    <motion.div className="min-h-screen bg-background py-12 px-4" variants={pageTransition} initial="hidden" animate="visible">
      <div className="mx-auto max-w-xl">
        {remaining !== null && (
          <div
            role="timer"
            aria-label="Time left"
            className={cn(
              "sticky top-0 z-20 mb-6 flex items-center justify-between border px-4 py-2.5 backdrop-blur",
              remaining < 60_000
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-border bg-background/90"
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Timer className={cn("h-4 w-4", remaining < 60_000 && "animate-pulse")} />
              {remaining < 60_000 ? "Hurry, time is almost up" : "Time left"}
            </span>
            <span className="font-mono text-lg font-semibold tabular-nums">{formatCountdown(remaining)}</span>
          </div>
        )}
        <BrandHeader brand={form.brand} />
        {form.coverImageUrl && (
          <img src={form.coverImageUrl} alt="" className="mb-6 max-h-48 w-full border border-border object-cover" />
        )}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            {form.isQuiz && <span className="border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">Quiz</span>}
            {form.expiresAt && !form.isQuiz && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Closes {timeUntilExpiry(form.expiresAt)}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{form.title}</h1>
          {form.description && <p className="mt-2 text-sm text-muted-foreground">{form.description}</p>}
          {form.settings.showProgressBar && allQuestions.length > 0 && (
            <div className="mt-4 h-1 w-full bg-border">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${(answeredCount / allQuestions.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}
        </motion.div>

        {form.isQuiz && isOpenForm && history.length === 0 && (
          <motion.div variants={fadeUp} className="mb-6 space-y-4 border border-border bg-card p-5">
            {user ? (
              <p className="text-sm text-muted-foreground">
                You'll appear on the leaderboard as <span className="font-medium text-foreground">{user.name}</span>.
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="quiz-name" className="text-sm font-semibold">
                  Your name <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">Shown on the leaderboard when results are published.</p>
                <Input
                  id="quiz-name"
                  value={respondentName}
                  maxLength={60}
                  autoComplete="name"
                  placeholder="e.g. Ada Lovelace"
                  onChange={(e) => setRespondentName(e.target.value)}
                />
              </div>
            )}
            {needsEmail && (
              <div className="space-y-1.5">
                <Label htmlFor="quiz-email" className="text-sm font-semibold">
                  Email address <span className="text-destructive">*</span>
                </Label>
                <Input id="quiz-email" type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
          </motion.div>
        )}

        {multiSection && currentSection && (currentSection.title || currentSection.description) && (
          <div className="mb-4 border-l-2 border-primary pl-3">
            {currentSection.title && <h2 className="text-lg font-semibold">{currentSection.title}</h2>}
            {currentSection.description && <p className="text-sm text-muted-foreground">{currentSection.description}</p>}
          </div>
        )}

        <motion.div key={sectionIndex} variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          {currentSection?.questions.map((q) => (
            <motion.div key={q._id} variants={fadeUp} className="border border-border bg-card p-5">
              <p className="mb-1 text-sm font-semibold">
                {q.title}
                {q.isRequired && <span className="ml-1 text-destructive">*</span>}
                {form.isQuiz && q.points ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({q.points} pts)</span>
                ) : null}
              </p>
              {q.description && <p className="mb-3 text-xs text-muted-foreground">{q.description}</p>}
              <div className="mt-3">
                <QuestionRenderer
                  formId={form.formId}
                  question={q}
                  value={answers[q._id] ?? {}}
                  onUploadNeedsAuth={
                    user
                      ? undefined
                      : () => {
                          submitAfterAuth.current = false;
                          setAuthOpen(true);
                        }
                  }
                  onChange={(patch) =>
                    setAnswers((prev) => {
                      const cur = prev[q._id] ?? {};
                      return { ...prev, [q._id]: typeof patch === "function" ? patch(cur) : { ...cur, ...patch } };
                    })
                  }
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {needsEmail && !form.isQuiz && isLastStep && (
          <motion.div variants={fadeUp} className="mt-6 border border-border bg-card p-5">
            <p className="mb-2 text-sm font-semibold">
              Email address <span className="text-destructive">*</span>
            </p>
            <Input type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="mt-8 flex items-center justify-between gap-2">
          {history.length > 0 ? (
            <Button variant="outline" onClick={handleBack}>
              ← Back
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleNextOrSubmit} disabled={busy} size="lg" className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {anyUploading ? "Uploading files…" : submit.isPending ? "Submitting…" : isLastStep ? "Submit" : "Next →"}
          </Button>
        </motion.div>
        <BrandFooter brand={form.brand} />
        <PoweredBy show={form.showPoweredBy} />
      </div>

      <AuthGateDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthenticated={() => submitAfterAuth.current && doSubmit()}
        googleRedirect={`/f/${shareToken}`}
        onBeforeGoogle={savePending}
      />
    </motion.div>
  );
}

// ─── State screens ─────────────────────────────────────────────────────────────
function FormStateScreen({
  icon,
  title,
  message,
  brand,
}: {
  icon: "check" | "clock" | "error";
  title: string;
  message: string;
  brand?: PublicBrand | null | undefined;
}) {
  const Icon = icon === "clock" ? Clock : icon === "error" ? AlertCircle : CheckCircle2;
  const tone = icon === "error" ? "text-destructive" : icon === "clock" ? "text-amber-500" : "text-emerald-500";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm border border-border bg-card p-10 text-center">
        <BrandHeader brand={brand} className="mb-6 justify-center" />
        <Icon className={`mx-auto mb-4 h-12 w-12 ${tone}`} />
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <BrandThankYou brand={brand} />
      </div>
    </div>
  );
}
