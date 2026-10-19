import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Hourglass, Loader2 } from "lucide-react";
import { useQuizResults } from "@/hooks/use-public-form";
import { useCountdown } from "@/hooks/use-countdown";
import { BrandFooter, BrandHeader } from "@/components/brand/brand-chrome";
import { PoweredBy } from "@/components/billing/powered-by";
import { cn, formatCountdown } from "@/lib/utils";
import { fadeUp, stagger } from "@/lib/animations";
import { PublicLeaderboard } from "./public-leaderboard";
import { ConfettiBurst } from "./confetti-burst";
import type { PublicForm, QuizResults, QuizReviewItem, QuizScoreStats } from "@/types";

function Stat({ label, value, of }: { label: string; value: string | number; of?: string | number }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-card p-3 sm:p-3.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-lg font-bold tabular-nums sm:text-xl">
        {value}
        {of !== undefined && <span className="text-sm font-medium text-muted-foreground">/{of}</span>}
      </span>
    </div>
  );
}

/** One line of context under the rank: distance from the average and from the next place up. */
function insight(score: number, stats: QuizScoreStats | undefined) {
  if (!stats) return null;
  const diff = Math.round((score - stats.average) * 10) / 10;
  const vsAvg = diff === 0 ? "Right on the average." : `${Math.abs(diff)} pts ${diff > 0 ? "above" : "below"} the average.`;
  const next = stats.nextUp
    ? ` ${stats.nextUp.gap} more ${stats.nextUp.gap === 1 ? "point" : "points"} would have matched #${stats.nextUp.rank}'s score.`
    : "";
  return vsAvg + next;
}

function MyResultCard({ results, timedOut }: { results: QuizResults; timedOut: boolean }) {
  const me = results.me!;
  const board = results.leaderboard;
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
  const participants = board?.participants ?? 0;
  const rank = board ? me.rank : undefined;
  const winner = rank === 1 && participants > 1;
  const topPct = rank !== undefined ? Math.max(1, Math.ceil((rank / participants) * 100)) : 0;
  const correct = results.review ? results.review.filter((r) => r.isCorrect).length : undefined;
  const line = insight(me.score, board?.stats);

  return (
    <motion.section
      variants={fadeUp}
      aria-label="Your result"
      className={cn("relative flex flex-col gap-5 border bg-card p-5 sm:p-6", winner ? "border-amber-400" : "border-primary")}
    >
      {rank !== undefined && rank <= 3 && <ConfettiBurst scale={1.1} delay={0.6} />}
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {rank !== undefined ? "Your rank" : "Your score"}
          </span>
          <p className="flex items-baseline gap-2">
            <span className={cn("text-5xl font-bold leading-none tabular-nums sm:text-6xl", winner ? "text-amber-500" : "text-primary")}>
              {rank !== undefined ? `#${rank}` : me.score}
            </span>
            <span className="text-sm text-muted-foreground">{rank !== undefined ? `of ${participants}` : `/ ${total} pts`}</span>
          </p>
        </div>
        {winner ? (
          <span className="bg-amber-400 px-2.5 py-1 text-sm font-bold text-amber-950">Winner</span>
        ) : (
          rank !== undefined &&
          participants >= 10 && <span className="bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground">Top {topPct}%</span>
        )}
      </div>

      <div className="h-2 bg-muted" role="img" aria-label={`Scored ${pct}% of the available points`}>
        <motion.div
          className={cn("h-full", winner ? "bg-amber-400" : "bg-primary")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      <div className="grid grid-cols-3 gap-px border border-border bg-border">
        {rank !== undefined ? <Stat label="Score" value={me.score} of={total} /> : <Stat label="Percent" value={`${pct}%`} />}
        {correct !== undefined ? <Stat label="Correct" value={correct} of={results.review!.length} /> : <Stat label="Percent" value={`${pct}%`} />}
        {me.timeTakenMs != null ? (
          <Stat label="Time" value={formatCountdown(me.timeTakenMs)} />
        ) : board ? (
          <Stat label="Average" value={board.stats.average} />
        ) : (
          <Stat label="Name" value={me.name} />
        )}
      </div>

      {line && <p className="text-sm leading-relaxed text-muted-foreground">{line}</p>}
      {timedOut && <p className="text-xs text-amber-600">Time ran out, so we submitted the answers you had.</p>}
    </motion.section>
  );
}

/** Histogram of everyone's scores with the viewer's bucket highlighted. Only meaningful with a crowd. */
function ScoreDistribution({ stats, maxPoints }: { stats: QuizScoreStats; maxPoints: number }) {
  const peak = Math.max(1, ...stats.histogram);
  return (
    <motion.section variants={fadeUp} aria-labelledby="dist-heading" className="flex flex-col gap-4 border border-border bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="dist-heading" className="text-base font-bold">
          Where you stand
        </h2>
        <span className="text-xs text-muted-foreground">
          Avg {stats.average} · Median {stats.median}
        </span>
      </div>
      <div className="flex h-32 items-end gap-1 border-b border-border" role="img" aria-label="Score distribution of all participants">
        {stats.histogram.map((count, i) => {
          const mine = i === stats.myBin;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${count} ${count === 1 ? "person" : "people"}`}>
              {mine && <span className="text-[10px] font-bold text-primary">YOU</span>}
              <motion.div
                className={cn("w-full", mine ? "bg-primary" : "bg-muted-foreground/30")}
                initial={{ height: 0 }}
                // The highlighted bar leaves room for its "YOU" label.
                animate={{ height: `${(count / peak) * (mine ? 82 : 100)}%` }}
                transition={{ duration: 0.6, delay: 0.03 * i }}
              />
            </div>
          );
        })}
      </div>
      <div className="-mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>0</span>
        <span>{Math.round(maxPoints / 2)}</span>
        <span>{maxPoints} pts</span>
      </div>
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

type ReviewFilter = "all" | "wrong" | "correct";

function Review({ items }: { items: QuizReviewItem[] }) {
  const correct = items.filter((i) => i.isCorrect).length;
  const wrong = items.length - correct;
  // Open on the mistakes; that's what people come back for.
  const [filter, setFilter] = useState<ReviewFilter>(wrong > 0 ? "wrong" : "all");
  const shown = items
    .map((item, i) => ({ item, n: i + 1 }))
    .filter(({ item }) => filter === "all" || (filter === "correct") === item.isCorrect);
  const chips: [ReviewFilter, string][] = [
    ["all", `All ${items.length}`],
    ["wrong", `Wrong ${wrong}`],
    ["correct", `Correct ${correct}`],
  ];

  return (
    <motion.section variants={fadeUp} aria-labelledby="review-heading" className="border border-border bg-card">
      <div className="flex items-baseline justify-between gap-3 p-5 pb-3 sm:px-6">
        <h2 id="review-heading" className="text-base font-bold">
          Review your answers
        </h2>
        <span className="text-xs text-muted-foreground">
          {correct} of {items.length} correct
        </span>
      </div>

      <div className="grid grid-cols-8 gap-1 px-5 pb-4 sm:px-6">
        {items.map((item, i) => (
          <a
            key={item.questionId}
            href={`#review-q-${i + 1}`}
            onClick={() => setFilter("all")}
            aria-label={`Question ${i + 1}: ${item.isCorrect ? "correct" : "incorrect"}`}
            className={cn(
              "flex h-8 items-center justify-center text-[11px] font-semibold tabular-nums",
              item.isCorrect ? "bg-muted text-foreground" : "bg-orange-500 text-orange-950"
            )}
          >
            {i + 1}
          </a>
        ))}
      </div>

      <div role="group" aria-label="Filter questions" className="flex flex-wrap gap-2 px-5 pb-4 sm:px-6">
        {chips.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "h-9 border px-3 text-xs font-semibold",
              filter === key ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ol className="divide-y divide-border border-t border-border">
        {shown.map(({ item, n }) => (
          <li key={item.questionId} id={`review-q-${n}`} className="scroll-mt-4 space-y-2.5 p-5 sm:px-6">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Question {n} · {item.pointsEarned}/{item.points} pts
              </span>
              <span className={cn("font-semibold", item.isCorrect ? "text-primary" : "text-orange-500")}>
                {item.isCorrect ? "Correct" : "Incorrect"}
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug">{item.title}</p>
            <p className={cn("border px-3 py-2 text-sm", item.isCorrect ? "border-primary/60" : "border-orange-500/70")}>
              <span className="text-muted-foreground">Your answer: </span>
              {item.yourAnswer.length ? item.yourAnswer.join(", ") : <em>No answer</em>}
            </p>
            {!item.isCorrect && (
              <p className="border border-primary/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Correct: </span>
                {item.correctAnswer.join(", ")}
              </p>
            )}
            {item.feedback && <p className="text-xs text-muted-foreground">{item.feedback}</p>}
          </li>
        ))}
      </ol>
    </motion.section>
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
  const board = results?.leaderboard;
  const review = results?.review?.length ? results.review : null;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      {/* Two columns on desktop once there's a leaderboard to put beside the personal result. */}
      <motion.div variants={stagger} initial="hidden" animate="visible" className={cn("mx-auto space-y-6", board ? "max-w-6xl" : "max-w-2xl")}>
        <BrandHeader brand={form.brand} />
        <motion.header variants={fadeUp} className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {results?.resultsPublished ? "Final results" : "Quiz results"}
          </span>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">{form.title}</h1>
          {board && (
            <p className="text-sm text-muted-foreground">
              {board.participants} {board.participants === 1 ? "participant" : "participants"}
            </p>
          )}
          {confirmationMessage && <p className="text-sm text-muted-foreground">{confirmationMessage}</p>}
          {results && !results.me && (
            <p className="text-sm text-muted-foreground">This quiz has ended{results.resultsPublished ? ". Here's how everyone did." : "."}</p>
          )}
        </motion.header>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && <p className="text-sm text-destructive">Couldn't load results. Refresh to try again.</p>}

        {results && (
          // Phones stack result → board → review; desktop puts the board in a right column beside both.
          <div
            className={cn(
              "flex flex-col gap-6",
              board && "lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:items-start"
            )}
          >
            <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
              {results.me && <MyResultCard results={results} timedOut={timedOut} />}
              {!results.resultsPublished && <PendingBanner results={results} />}
              {board && board.participants >= 10 && board.maxPoints > 0 && (
                <ScoreDistribution stats={board.stats} maxPoints={board.maxPoints} />
              )}
            </div>
            {board && (
              <motion.div variants={fadeUp} className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                <PublicLeaderboard board={board} shareToken={shareToken} sessionToken={sessionToken} celebrate />
              </motion.div>
            )}
            {review && (
              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <Review items={review} />
              </div>
            )}
          </div>
        )}

        <BrandFooter brand={form.brand} />
        <PoweredBy show={form.showPoweredBy} />
      </motion.div>
    </div>
  );
}
