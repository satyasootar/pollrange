import { motion } from "framer-motion";
import { CheckCircle2, Clock, Hourglass, XCircle, ChevronDown, Loader2 } from "lucide-react";
import { useQuizResults } from "@/hooks/use-public-form";
import { useCountdown } from "@/hooks/use-countdown";
import { BrandFooter, BrandHeader } from "@/components/brand/brand-chrome";
import { PoweredBy } from "@/components/billing/powered-by";
import { cn, formatCountdown } from "@/lib/utils";
import { fadeUp, stagger } from "@/lib/animations";
import { Leaderboard } from "./leaderboard";
import { ConfettiBurst } from "./confetti-burst";
import type { PublicForm, QuizResults, QuizReviewItem } from "@/types";

function ScoreRing({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-border" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          className="stroke-primary"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">{pct}%</span>
    </div>
  );
}

function MyResultCard({ results, timedOut }: { results: QuizResults; timedOut: boolean }) {
  const me = results.me!;
  const participants = results.leaderboard?.participants;
  if (me.score === undefined) {
    return (
      <motion.section variants={fadeUp} className="flex items-start gap-4 border border-border bg-card p-5">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
        <div>
          <p className="font-semibold">Your answers are in{me.name !== "Anonymous" ? `, ${me.name}` : ""}.</p>
          <p className="mt-1 text-sm text-muted-foreground">Your score will be revealed when the results are published.</p>
          {timedOut && <p className="mt-2 text-xs text-amber-600">Time ran out, so we submitted the answers you had.</p>}
        </div>
      </motion.section>
    );
  }
  const total = me.totalPoints ?? results.maxPoints;
  const pct = total > 0 ? Math.round((me.score / total) * 100) : 0;
  const podium = me.rank !== undefined && me.rank <= 3;
  return (
    <motion.section variants={fadeUp} aria-label="Your result" className="relative border-2 border-primary/40 bg-card p-5 sm:p-6">
      {podium && <ConfettiBurst scale={1.1} delay={0.6} />}
      <div className="flex items-center gap-5">
        <ScoreRing pct={pct} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your score</p>
          <p className="text-3xl font-bold tabular-nums sm:text-4xl">
            {me.score}
            <span className="text-lg font-medium text-muted-foreground"> / {total}</span>
          </p>
          <p className="truncate text-sm text-muted-foreground">{me.name}</p>
        </div>
        {me.rank !== undefined && (
          <div className="shrink-0 border-l border-border pl-5 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rank</p>
            <p className={cn("text-3xl font-bold tabular-nums sm:text-4xl", podium && "text-amber-500")}>#{me.rank}</p>
            {participants !== undefined && <p className="text-xs text-muted-foreground">of {participants}</p>}
          </div>
        )}
      </div>
      {timedOut && <p className="mt-4 text-xs text-amber-600">Time ran out, so we submitted the answers you had.</p>}
    </motion.section>
  );
}

/** Shown until the creator publishes: a live countdown when the quiz is still running, else a waiting note. */
function PendingBanner({ results }: { results: QuizResults }) {
  const remaining = useCountdown(results.status === "active" ? results.expiresAt : undefined, results.serverTime);
  const running = remaining !== null && remaining > 0;
  const publishingNow = results.autoPublishResults && remaining === 0;
  return (
    <motion.div variants={fadeUp} aria-live="polite" className="flex items-start gap-3 border border-border bg-muted/40 p-4">
      {running ? (
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      ) : publishingNow ? (
        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />
      ) : (
        <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
      )}
      <div className="text-sm">
        {running ? (
          <>
            <p className="font-medium">
              Quiz ends in <span className="tabular-nums">{formatCountdown(remaining)}</span>
            </p>
            <p className="text-muted-foreground">
              {results.autoPublishResults
                ? "The leaderboard goes live automatically when the timer ends."
                : "The organizer will publish the leaderboard after the quiz ends."}
            </p>
          </>
        ) : publishingNow ? (
          <p className="font-medium">Time's up! Publishing results…</p>
        ) : (
          <>
            <p className="font-medium">Waiting for the organizer to publish results</p>
            <p className="text-muted-foreground">Keep this page open. It updates automatically.</p>
          </>
        )}
      </div>
    </motion.div>
  );
}

function Review({ items }: { items: QuizReviewItem[] }) {
  const correct = items.filter((i) => i.isCorrect).length;
  return (
    <motion.details variants={fadeUp} className="group border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span className="font-semibold">Review your answers</span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {correct} of {items.length} correct
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <ol className="space-y-3 border-t border-border p-4">
        {items.map((item, i) => (
          <li
            key={item.questionId}
            className={cn("border-l-4 bg-muted/30 p-3", item.isCorrect ? "border-l-emerald-500" : "border-l-destructive")}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-start gap-2 text-sm font-medium">
                {item.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-label="Correct" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-label="Incorrect" />
                )}
                <span>
                  {i + 1}. {item.title}
                </span>
              </p>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                {item.pointsEarned}/{item.points} pts
              </span>
            </div>
            <dl className="mt-2 space-y-1 pl-6 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Your answer:</dt>
                <dd className={item.isCorrect ? "text-emerald-600" : "text-destructive"}>
                  {item.yourAnswer.length ? item.yourAnswer.join(", ") : <em>No answer</em>}
                </dd>
              </div>
              {!item.isCorrect && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Correct answer:</dt>
                  <dd className="text-emerald-600">{item.correctAnswer.join(", ")}</dd>
                </div>
              )}
            </dl>
            {item.feedback && <p className="mt-2 pl-6 text-xs text-muted-foreground">{item.feedback}</p>}
          </li>
        ))}
      </ol>
    </motion.details>
  );
}

/**
 * The quiz link after the quiz is done for this viewer (submitted, revisiting, or ended):
 * their own result, a waiting state, then the published leaderboard + answer review.
 */
export function QuizResultScreen({
  form,
  shareToken,
  sessionToken,
  confirmationMessage,
  timedOut = false,
}: {
  form: PublicForm;
  shareToken: string;
  sessionToken: string;
  /** The creator's thank-you text, shown right after submitting. */
  confirmationMessage?: string | undefined;
  timedOut?: boolean;
}) {
  const { data: results, isLoading, isError } = useQuizResults(shareToken, sessionToken);

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-12">
      <motion.div variants={stagger} initial="hidden" animate="visible" className="mx-auto max-w-2xl space-y-6">
        <BrandHeader brand={form.brand} />
        <motion.header variants={fadeUp}>
          <span className="mb-2 inline-block border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">Quiz results</span>
          <h1 className="text-2xl font-bold leading-tight">{form.title}</h1>
          {confirmationMessage && <p className="mt-1 text-sm text-muted-foreground">{confirmationMessage}</p>}
          {results && !results.me && (
            <p className="mt-1 text-sm text-muted-foreground">This quiz has ended{results.resultsPublished ? ". Here's how everyone did." : "."}</p>
          )}
        </motion.header>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && <p className="text-sm text-destructive">Couldn't load results. Refresh to try again.</p>}

        {results && (
          <>
            {results.me && <MyResultCard results={results} timedOut={timedOut} />}
            {!results.resultsPublished && <PendingBanner results={results} />}
            {results.leaderboard && (
              <motion.div variants={fadeUp} className="border border-border bg-card p-4 sm:p-6">
                <Leaderboard
                  entries={results.leaderboard.entries}
                  participants={results.leaderboard.participants}
                  maxPoints={results.leaderboard.maxPoints}
                  celebrate
                  me={
                    results.me?.rank !== undefined
                      ? { name: results.me.name, score: results.me.score ?? 0, rank: results.me.rank }
                      : null
                  }
                />
              </motion.div>
            )}
            {results.review && results.review.length > 0 && <Review items={results.review} />}
          </>
        )}

        <BrandFooter brand={form.brand} />
        <PoweredBy show={form.showPoweredBy} />
      </motion.div>
    </div>
  );
}
