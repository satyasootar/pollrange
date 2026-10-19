import { useState, useMemo, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePublicForm, useSubmitFormResponse } from "@/hooks/use-public-form";
import { QuestionRenderer, type AnswerChange, type AnswerDraft } from "@/components/form-public/question-renderer";
import { PaymentDue } from "@/components/form-public/payment-due";
import { selectionError } from "@/lib/upi-payment";
import { fadeUp, stagger, pageTransition } from "@/lib/animations";
import { cn, getOrCreateSessionToken, shuffle, timeUntilExpiry, toastApiError } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/use-auth-store";
import { AuthGateDialog } from "@/components/auth/auth-gate-dialog";
import { PoweredBy } from "@/components/billing/powered-by";
import { useBrandTheme } from "@/hooks/use-brand-theme";
import { BrandFooter, BrandHeader, BrandThankYou } from "@/components/brand/brand-chrome";
import { QuizResultScreen } from "@/components/quiz-results/quiz-result-screen";
import { useCountdown } from "@/hooks/use-countdown";
import { useQuizLiveSocket } from "@/hooks/use-quiz-live";
import { formPublicApi } from "@/api/form-public.api";
import { QuizIntro } from "@/components/form-public/quiz-intro";
import {
  QuizNavigatorSheet,
  QuizProgressPanel,
  QuizTopBar,
  type QuizJump,
  type QuizNavSection,
} from "@/components/form-public/quiz-progress";
import { GRADABLE_TYPES } from "@/components/form-builder/question-types";
import type { FormQuestion, FormSection, FormAnswerPayload, PublicBrand, QuizLiveState, SubmitFormResult } from "@/types";

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

/** How to answer, shown on quiz question cards. */
function answerHint(q: FormQuestion): string | null {
  switch (q.type) {
    case "multiple_choice":
    case "dropdown":
      return "Choose one";
    case "checkboxes":
      return "Choose all that apply";
    case "multiple_choice_grid":
      return "One per row";
    case "checkbox_grid":
      return "Any per row";
    default:
      return null;
  }
}

/** jsdom has no scrollIntoView, hence the optional call. */
const scrollToQuestion = (id: string) =>
  document.getElementById(`q-${id}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });

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
  // What to do once the sign-in gate succeeds: submit, start the quiz, or nothing (a file pick just retries).
  const afterAuthRef = useRef<"submit" | "start" | "none">("submit");
  // Quiz: instructions page first, then the questions.
  const [started, setStarted] = useState(false);
  // Per-person timer started in this visit (a refresh resumes from form.attempt instead).
  const [attempt, setAttempt] = useState<{ endsAt: string; serverTime: string } | null>(null);
  const [startingAttempt, setStartingAttempt] = useState(false);
  // Live quiz: the host's latest push (start / +time / end), newer than the loaded form.
  const [livePush, setLivePush] = useState<QuizLiveState | null>(null);
  // Live quiz: pressed "I'm ready" in the lobby, so they go straight in when the host starts.
  const [queued, setQueued] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // Question numbers still unanswered when the taker hits Submit (opens the confirm dialog).
  const [missing, setMissing] = useState<number[] | null>(null);
  const pendingScrollRef = useRef<string | null>(null);
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

  // ── Quiz timing ── the server is the only clock; every deadline comes with its serverTime.
  const timerMode = form?.isQuiz ? (form.quizTimer?.mode ?? "none") : "none";
  const takingAllowed = !!form?.isQuiz && form.status === "active" && !form.alreadyResponded && !submitted;
  useQuizLiveSocket(timerMode === "live" && takingAllowed ? form?.formId : undefined, setLivePush);
  const liveStartedAt = livePush?.startedAt ?? form?.liveStartedAt;
  const liveState = timerMode !== "live" ? null : livePush?.state === "ended" ? "ended" : liveStartedAt ? "running" : "waiting";
  const myAttempt = attempt ?? (form?.attempt && form.serverTime ? { endsAt: form.attempt.endsAt, serverTime: form.serverTime } : null);
  // In the questions: pressed Start, resumed a per-person attempt, or was waiting in the lobby when the host started.
  const inQuiz = started || (timerMode === "per_person" && !!form?.attempt) || (queued && liveState === "running");
  const deadline =
    timerMode === "per_person"
      ? inQuiz ? myAttempt?.endsAt : form?.expiresAt
      : timerMode === "live"
        ? liveStartedAt ? (livePush?.endsAt ?? form?.expiresAt) : undefined
        : form?.expiresAt;
  const clockServerTime =
    timerMode === "per_person" && inQuiz ? myAttempt?.serverTime : timerMode === "live" && livePush ? livePush.serverTime : form?.serverTime;
  const remaining = useCountdown(takingAllowed ? deadline ?? undefined : undefined, clockServerTime, handleTimeUp);

  // Quiz section change: bring the target question (from the navigator) or the section's first question into view.
  useEffect(() => {
    if (!form?.isQuiz || !inQuiz) return;
    const id = pendingScrollRef.current ?? sections[sectionIndex]?.questions[0]?._id;
    pendingScrollRef.current = null;
    if (!id) return;
    const t = setTimeout(() => scrollToQuestion(id), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIndex]);

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
  if (
    form.isQuiz &&
    (submitted || form.alreadyResponded || timeoutPhase === "ended" || form.status !== "active" || (liveState === "ended" && !inQuiz))
  ) {
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

  const numberOf = new Map(allQuestions.map((q, i) => [q._id, i + 1]));

  const finishSubmit = () => {
    if (form.responseMode === "authenticated" && !user) {
      afterAuthRef.current = "submit";
      setAuthOpen(true);
      return;
    }
    doSubmit();
  };

  const handleNextOrSubmit = () => {
    if (!sectionValid()) return;
    const next = computeNext();
    if (next === "submit") {
      if (form.isQuiz) {
        // Only sections they actually saw: branching may have skipped the rest.
        const unanswered = sections
          .filter((s) => visitedRef.current.has(s._id))
          .flatMap((s) => s.questions)
          .filter((q) => !draftHasValue(answers[q._id]))
          .map((q) => numberOf.get(q._id)!);
        if (unanswered.length) {
          setMissing(unanswered);
          return;
        }
      }
      finishSubmit();
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
  const actionLabel = anyUploading
    ? "Uploading files…"
    : submit.isPending
      ? "Submitting…"
      : isLastStep
        ? form.isQuiz ? "Submit quiz" : "Submit"
        : form.isQuiz ? "Next section" : "Next →";

  const setAnswer = (q: FormQuestion): AnswerChange => (patch) =>
    setAnswers((prev) => {
      const cur = prev[q._id] ?? {};
      return { ...prev, [q._id]: typeof patch === "function" ? patch(cur) : { ...cur, ...patch } };
    });
  const pickFileNeedsAuth = user
    ? undefined
    : () => {
        afterAuthRef.current = "none";
        setAuthOpen(true);
      };

  const questionCards = (
    <motion.div key={sectionIndex} variants={stagger} initial="hidden" animate="visible" className={form.isQuiz ? "space-y-3 sm:space-y-4" : "space-y-6"}>
      {currentSection?.questions.map((q) => (
        <motion.div
          key={q._id}
          id={`q-${q._id}`}
          variants={fadeUp}
          className={cn("border border-border bg-card p-5", form.isQuiz && "scroll-mt-48 p-4 sm:scroll-mt-40 sm:p-5 lg:scroll-mt-6")}
        >
          {form.isQuiz ? (
            <div className="mb-2 flex items-center justify-between gap-3 font-mono text-xs">
              <span className={cn("font-semibold", draftHasValue(answers[q._id]) ? "text-primary" : "text-muted-foreground")}>
                Question {numberOf.get(q._id)} of {allQuestions.length}
              </span>
              <span className="text-right text-muted-foreground">
                {[answerHint(q), q.points ? `${q.points} pts` : null].filter(Boolean).join(" · ")}
              </span>
            </div>
          ) : null}
          <p className={form.isQuiz ? "text-base leading-snug font-semibold" : "mb-1 text-sm font-semibold"}>
            {q.title}
            {q.isRequired && <span className="ml-1 text-destructive">*</span>}
          </p>
          {q.description && <p className="mt-1 mb-3 text-xs text-muted-foreground">{q.description}</p>}
          <div className="mt-3">
            <QuestionRenderer
              formId={form.formId}
              question={q}
              value={answers[q._id] ?? {}}
              onUploadNeedsAuth={pickFileNeedsAuth}
              onChange={setAnswer(q)}
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );

  // Start pressed (details already validated by the intro).
  const beginQuiz = async () => {
    if (liveState === "waiting") {
      setQueued(true); // the host's Start opens the quiz
      return;
    }
    if (timerMode === "per_person") {
      setStartingAttempt(true);
      try {
        const { endsAt, serverTime } = (await formPublicApi.startAttempt(form.formId, sessionToken)).data.data;
        setAttempt({ endsAt, serverTime });
      } catch (err) {
        toastApiError(err);
        return;
      } finally {
        setStartingAttempt(false);
      }
    }
    setStarted(true);
  };

  const authGate = (
    <AuthGateDialog
      open={authOpen}
      onOpenChange={setAuthOpen}
      onAuthenticated={() => {
        if (afterAuthRef.current === "submit") doSubmit();
        else if (afterAuthRef.current === "start") void beginQuiz();
      }}
      googleRedirect={`/f/${shareToken}`}
      onBeforeGoogle={savePending}
    />
  );

  if (form.isQuiz) {
    const signInRequired = form.responseMode === "authenticated" && !user;
    if (!inQuiz) {
      return (
        <>
          <QuizIntro
            form={form}
            questionCount={allQuestions.length}
            totalPoints={allQuestions.reduce((sum, q) => sum + (GRADABLE_TYPES.includes(q.type) ? q.points ?? 0 : 0), 0)}
            hasMultiSelect={allQuestions.some((q) => q.type === "checkboxes" || q.type === "checkbox_grid")}
            remaining={remaining}
            timerMode={timerMode}
            durationMinutes={form.quizTimer?.durationMinutes}
            liveState={liveState === "ended" ? null : liveState}
            queued={queued}
            starting={startingAttempt}
            askName={askName}
            name={respondentName}
            onNameChange={setRespondentName}
            needsEmail={needsEmail}
            email={email}
            onEmailChange={setEmail}
            signInRequired={signInRequired}
            signedInAs={user?.name}
            onStart={() => {
              if (signInRequired) {
                afterAuthRef.current = "start";
                setAuthOpen(true);
                return;
              }
              void beginQuiz();
            }}
          />
          {authGate}
        </>
      );
    }

    const historySet = new Set(history);
    const navSections: QuizNavSection[] = sections.map((sec, i) => ({
      index: i,
      title: sec.title || `Section ${i + 1}`,
      state: i === sectionIndex ? "current" : historySet.has(i) ? "visited" : "locked",
      items: sec.questions.map((q) => ({ id: q._id, n: numberOf.get(q._id)!, answered: draftHasValue(answers[q._id]) })),
    }));
    const jumpTo: QuizJump = (sec, item) => {
      setNavOpen(false);
      if (sec.index === sectionIndex) {
        // Let the sheet close (and release its scroll lock) first.
        setTimeout(() => scrollToQuestion(item.id), 200);
        return;
      }
      const at = history.indexOf(sec.index);
      if (at === -1) return;
      pendingScrollRef.current = item.id;
      setHistory(history.slice(0, at));
      setSectionIndex(sec.index);
    };
    const first = currentSection?.questions[0];
    const last = currentSection?.questions[currentSection.questions.length - 1];
    const range = first && last ? `${numberOf.get(first._id)}–${numberOf.get(last._id)}` : "";
    const sectionLabel = multiSection ? `Section ${sectionIndex + 1} of ${sections.length}` : "Quiz";

    return (
      <motion.div className="min-h-screen bg-background px-4 pt-6 sm:px-8 sm:pt-10" variants={pageTransition} initial="hidden" animate="visible">
        <div className="mx-auto max-w-xl md:max-w-2xl lg:max-w-5xl">
          <BrandHeader brand={form.brand} />
          <header className="mb-4 lg:mb-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">{sectionLabel}</span>
            <h1 className="mt-1 text-2xl leading-tight font-extrabold tracking-tight lg:text-[32px]">
              {multiSection && currentSection?.title ? currentSection.title : form.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {multiSection && currentSection?.title ? `${form.title} · ` : ""}
              {currentSection && currentSection.questions.length > 1 ? `Questions ${range}` : `Question ${range.split("–")[0]}`} of{" "}
              {allQuestions.length}
            </p>
            {currentSection?.description && <p className="mt-2 text-sm text-muted-foreground">{currentSection.description}</p>}
          </header>

          <QuizTopBar
            sectionLabel={sectionLabel}
            sectionTitle={multiSection ? currentSection?.title || form.title : form.title}
            answered={answeredCount}
            total={allQuestions.length}
            remaining={remaining}
            onOpenNavigator={() => setNavOpen(true)}
          />

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
            <main className="min-w-0">
              {questionCards}
              <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex gap-2 border-t border-border bg-background/95 px-4 pt-3 pb-5 backdrop-blur sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pb-10">
                {history.length > 0 && (
                  <Button variant="outline" size="lg" onClick={handleBack} className="h-12 flex-1 sm:flex-none sm:px-6">
                    Back
                  </Button>
                )}
                <Button onClick={handleNextOrSubmit} disabled={busy} size="lg" className="h-12 flex-2 gap-2 font-bold sm:ml-auto sm:flex-none sm:px-8">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {actionLabel}
                </Button>
              </div>
            </main>
            <QuizProgressPanel remaining={remaining} answered={answeredCount} total={allQuestions.length} sections={navSections} onJump={jumpTo} />
          </div>
          <BrandFooter brand={form.brand} />
          <PoweredBy show={form.showPoweredBy} />
        </div>

        <QuizNavigatorSheet
          open={navOpen}
          onOpenChange={setNavOpen}
          answered={answeredCount}
          total={allQuestions.length}
          sections={navSections}
          onJump={jumpTo}
        />

        <Dialog open={missing !== null} onOpenChange={(open) => !open && setMissing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {missing?.length} question{missing?.length === 1 ? "" : "s"} not answered
              </DialogTitle>
              <DialogDescription>
                You haven't answered question{missing?.length === 1 ? "" : "s"} {missing?.join(", ")}. Unanswered questions score 0, and
                you can't change answers after submitting.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  const firstMissing = allQuestions.find((q) => numberOf.get(q._id) === missing?.[0]);
                  setMissing(null);
                  const sec = navSections.find((ns) => ns.items.some((i) => i.id === firstMissing?._id));
                  const item = sec?.items.find((i) => i.id === firstMissing?._id);
                  if (sec && item) jumpTo(sec, item);
                }}
              >
                Review
              </Button>
              <Button
                onClick={() => {
                  setMissing(null);
                  finishSubmit();
                }}
              >
                Submit anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {authGate}
      </motion.div>
    );
  }

  return (
    <motion.div className="min-h-screen bg-background py-12 px-4" variants={pageTransition} initial="hidden" animate="visible">
      <div className="mx-auto max-w-xl">
        <BrandHeader brand={form.brand} />
        {form.coverImageUrl && (
          <img src={form.coverImageUrl} alt="" className="mb-6 max-h-48 w-full border border-border object-cover" />
        )}
        <motion.div variants={fadeUp} className="mb-8">
          {form.expiresAt && (
            <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> Closes {timeUntilExpiry(form.expiresAt)}
            </div>
          )}
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

        {multiSection && currentSection && (currentSection.title || currentSection.description) && (
          <div className="mb-4 border-l-2 border-primary pl-3">
            {currentSection.title && <h2 className="text-lg font-semibold">{currentSection.title}</h2>}
            {currentSection.description && <p className="text-sm text-muted-foreground">{currentSection.description}</p>}
          </div>
        )}

        {questionCards}

        {needsEmail && isLastStep && (
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
            {actionLabel}
          </Button>
        </motion.div>
        <BrandFooter brand={form.brand} />
        <PoweredBy show={form.showPoweredBy} />
      </div>
      {authGate}
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
