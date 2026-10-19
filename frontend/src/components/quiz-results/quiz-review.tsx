import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { QuizReviewItem } from "@/types";

function AnswerBox({ label, answer, tone }: { label: string; answer: string[]; tone: "right" | "wrong" }) {
  const Icon = tone === "right" ? Check : X;
  return (
    <div
      className={cn(
        "flex gap-3 border p-3.5 sm:p-4",
        tone === "right" ? "border-emerald-500/50 bg-emerald-500/10" : "border-orange-500/50 bg-orange-500/10"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center",
          tone === "right" ? "bg-emerald-500 text-white" : "bg-orange-500 text-orange-950"
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-[15px] font-medium leading-snug">
          {answer.length ? answer.join(", ") : <em className="font-normal text-muted-foreground">No answer</em>}
        </p>
      </div>
    </div>
  );
}

/**
 * Answer review, one question at a time: a numbered navigator, Prev/Next (also ← →), and a
 * "mistakes only" switch. Opens on the first mistake, since that's what people come back for.
 */
export function QuizReview({ items }: { items: QuizReviewItem[] }) {
  const correct = items.filter((i) => i.isCorrect).length;
  const wrong = items.length - correct;
  const [mistakesOnly, setMistakesOnly] = useState(false);
  const [current, setCurrent] = useState(() => Math.max(0, items.findIndex((i) => !i.isCorrect)));

  // The questions Prev/Next walk through.
  const path = items.map((_, i) => i).filter((i) => !mistakesOnly || !items[i]!.isCorrect);
  const pos = path.indexOf(current);
  const prev = pos > 0 ? path[pos - 1] : undefined;
  const next = pos !== -1 && pos < path.length - 1 ? path[pos + 1] : undefined;
  const item = items[current]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [role=switch]")) return;
      if (e.key === "ArrowLeft" && prev !== undefined) setCurrent(prev);
      if (e.key === "ArrowRight" && next !== undefined) setCurrent(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const toggleMistakes = (on: boolean) => {
    setMistakesOnly(on);
    if (on && item.isCorrect) {
      const firstWrong = items.findIndex((i) => !i.isCorrect);
      if (firstWrong !== -1) setCurrent(firstWrong);
    }
  };
  const jump = (i: number) => {
    if (mistakesOnly && items[i]!.isCorrect) setMistakesOnly(false);
    setCurrent(i);
  };

  return (
    <section aria-label="Review your answers" className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
      {/* Navigator: a scrolling strip on phones, a sticky panel beside the question on laptops. */}
      <div className="border border-border bg-card p-4 lg:sticky lg:top-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold">
            {correct}/{items.length} correct
          </p>
          <div className="flex items-center gap-2">
            <Switch id="mistakes-only" checked={mistakesOnly} onCheckedChange={toggleMistakes} disabled={wrong === 0} />
            <Label htmlFor="mistakes-only" className="cursor-pointer text-xs">
              Mistakes only ({wrong})
            </Label>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0">
          {items.map((it, i) => {
            const dimmed = mistakesOnly && it.isCorrect;
            return (
              <button
                key={it.questionId}
                type="button"
                onClick={() => jump(i)}
                aria-label={`Question ${i + 1}: ${it.isCorrect ? "correct" : "incorrect"}`}
                aria-current={i === current ? "step" : undefined}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center text-xs font-semibold tabular-nums transition lg:w-auto",
                  it.isCorrect ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-orange-500/90 text-orange-950",
                  i === current && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                  dimmed && "opacity-30"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <p className="mt-3 hidden text-[11px] text-muted-foreground lg:block">Tip: use ← → to move between questions.</p>
      </div>

      {/* The current question. */}
      <article key={item.questionId} className="flex flex-col border border-border bg-card animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3 sm:px-6">
          <span className="text-xs font-medium text-muted-foreground">
            Question {current + 1} of {items.length}
            {mistakesOnly && pos !== -1 && ` · mistake ${pos + 1} of ${path.length}`}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold",
              item.isCorrect ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-orange-500/15 text-orange-500"
            )}
          >
            {item.isCorrect ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {item.isCorrect ? "Correct" : "Incorrect"} · {item.pointsEarned}/{item.points} pts
          </span>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
          <h3 className="text-lg font-bold leading-snug sm:text-xl">{item.title}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <AnswerBox label="Your answer" answer={item.yourAnswer} tone={item.isCorrect ? "right" : "wrong"} />
            {!item.isCorrect && <AnswerBox label="Correct answer" answer={item.correctAnswer} tone="right" />}
          </div>
          {item.feedback && (
            <div className="flex gap-3 border border-border bg-muted/40 p-3.5 sm:p-4">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Why: </span>
                {item.feedback}
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-6">
          <Button variant="outline" onClick={() => prev !== undefined && setCurrent(prev)} disabled={prev === undefined}>
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {pos === -1 ? "" : `${pos + 1} / ${path.length}`}
          </span>
          <Button onClick={() => next !== undefined && setCurrent(next)} disabled={next === undefined}>
            {mistakesOnly ? "Next mistake" : "Next"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </article>
    </section>
  );
}
