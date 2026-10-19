import { motion } from "framer-motion";
import { LayoutGrid, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatCountdown } from "@/lib/utils";

export interface QuizNavItem {
  id: string;
  /** 1-based number across the whole quiz. */
  n: number;
  answered: boolean;
}

export interface QuizNavSection {
  index: number;
  title: string;
  items: QuizNavItem[];
  /** current = on screen, visited = reachable with Back, locked = not reached (or skipped by branching). */
  state: "current" | "visited" | "locked";
}

export type QuizJump = (section: QuizNavSection, item: QuizNavItem) => void;

const URGENT_MS = 60_000;

function TimerChip({ remaining, className }: { remaining: number; className?: string }) {
  const urgent = remaining < URGENT_MS;
  return (
    <span
      role="timer"
      aria-label={`Time left ${formatCountdown(remaining)}`}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 border px-2.5 font-mono text-[15px] font-bold tabular-nums",
        urgent ? "border-destructive/60 bg-destructive/10 text-destructive" : "border-border",
        className
      )}
    >
      <Timer className={cn("h-3.5 w-3.5", urgent ? "animate-pulse" : "text-primary")} aria-hidden />
      {formatCountdown(remaining)}
    </span>
  );
}

function ProgressBar({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="h-1.5 bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Questions answered">
      <motion.div
        className="h-full bg-primary"
        animate={{ width: `${total ? (answered / total) * 100 : 0}%` }}
        transition={{ duration: 0.35 }}
      />
    </div>
  );
}

function Counts({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="flex items-center gap-3.5 text-[13px]">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 bg-primary" aria-hidden />
        <strong className="font-mono tabular-nums">{answered}</strong> answered
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-2.5 w-2.5 border border-dashed border-muted-foreground" aria-hidden />
        <strong className="font-mono tabular-nums text-foreground">{total - answered}</strong> left
      </span>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 bg-primary" aria-hidden /> Answered
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 border border-dashed border-muted-foreground" aria-hidden /> Not answered
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 border-2 border-foreground" aria-hidden /> On screen
      </span>
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-[22px] font-bold tabular-nums", accent && "text-primary")}>{value}</span>
    </div>
  );
}

/** Numbered tiles per section: filled = answered, dashed = not yet, ringed = on screen. */
export function QuizNavigatorGrid({ sections, onJump }: { sections: QuizNavSection[]; onJump: QuizJump }) {
  const multi = sections.length > 1;
  return (
    <div className="space-y-4">
      {sections.map((s) => {
        const done = s.items.filter((i) => i.answered).length;
        const note = s.state === "current" ? "You are here" : s.state === "visited" ? `${done} of ${s.items.length} done` : "Not reached";
        return (
          <div key={s.index} className="space-y-2">
            {multi && (
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-semibold">
                  {s.index + 1} · {s.title}
                </span>
                <span className="shrink-0 text-muted-foreground">{note}</span>
              </div>
            )}
            <div className="grid grid-cols-6 gap-1.5">
              {s.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={s.state === "locked"}
                  onClick={() => onJump(s, item)}
                  aria-label={`Question ${item.n}, ${item.answered ? "answered" : "not answered"}${s.state === "locked" ? ", not reached yet" : ""}`}
                  className={cn(
                    "h-11 font-mono text-[13px] font-bold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 lg:h-9 lg:text-xs",
                    item.answered
                      ? "bg-primary text-primary-foreground"
                      : "border border-dashed border-muted-foreground/60 text-muted-foreground enabled:hover:border-foreground enabled:hover:text-foreground",
                    s.state === "current" && "ring-2 ring-inset ring-foreground"
                  )}
                >
                  {item.n}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {multi && <p className="text-xs text-muted-foreground">Later sections open as you press Next.</p>}
    </div>
  );
}

/** Phone + tablet: sticky bar with section, timer, progress and the navigator button. Hidden on laptops (see the panel). */
export function QuizTopBar({
  sectionLabel,
  sectionTitle,
  answered,
  total,
  remaining,
  onOpenNavigator,
}: {
  sectionLabel: string;
  sectionTitle: string;
  answered: number;
  total: number;
  remaining: number | null;
  onOpenNavigator: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:hidden">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{sectionLabel}</span>
            <span className="truncate text-sm font-semibold sm:text-base">{sectionTitle}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <Counts answered={answered} total={total} />
            </div>
            {remaining !== null && <TimerChip remaining={remaining} />}
          </div>
        </div>
        <ProgressBar answered={answered} total={total} />
        <div className="flex items-center justify-between gap-2">
          <div className="sm:hidden">
            <Counts answered={answered} total={total} />
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">
            {answered} of {total} questions answered
          </span>
          <button
            type="button"
            onClick={onOpenNavigator}
            className="flex h-9 items-center gap-1.5 border border-border px-2.5 text-[13px] font-semibold transition-colors hover:bg-muted"
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden /> Questions
          </button>
        </div>
      </div>
    </div>
  );
}

/** Phone + tablet: the navigator as a bottom sheet. */
export function QuizNavigatorSheet({
  open,
  onOpenChange,
  answered,
  total,
  sections,
  onJump,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answered: number;
  total: number;
  sections: QuizNavSection[];
  onJump: QuizJump;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 left-0 max-h-[85vh] max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none p-0 sm:max-w-full lg:hidden">
        <div className="flex justify-center pt-2" aria-hidden>
          <span className="h-1 w-10 bg-border" />
        </div>
        <DialogHeader className="px-4 pt-3 pb-3 text-left">
          <DialogTitle className="text-[17px]">Your progress</DialogTitle>
          <DialogDescription>Tap a number to jump to that question.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-px border-y border-border bg-border">
          <StatCell label="Answered" value={answered} accent />
          <StatCell label="Not answered" value={total - answered} />
          <StatCell label="Total" value={total} />
        </div>
        <div className="p-4">
          <QuizNavigatorGrid sections={sections} onJump={onJump} />
        </div>
        <div className="border-t border-border px-4 pt-3 pb-5">
          <Legend />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Laptop: sticky side panel with the big timer, counts and the navigator. */
export function QuizProgressPanel({
  remaining,
  answered,
  total,
  sections,
  onJump,
}: {
  remaining: number | null;
  answered: number;
  total: number;
  sections: QuizNavSection[];
  onJump: QuizJump;
}) {
  const pct = total ? Math.round((answered / total) * 100) : 0;
  const urgent = remaining !== null && remaining < URGENT_MS;
  return (
    <aside aria-label="Quiz progress" className="sticky top-6 hidden flex-col gap-4 lg:flex">
      {remaining !== null && (
        <section className={cn("flex flex-col gap-1.5 border bg-card p-5", urgent ? "border-destructive/60" : "border-border")}>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time left</span>
          <span role="timer" className={cn("font-mono text-[44px] leading-none font-bold tabular-nums", urgent && "animate-pulse text-destructive")}>
            {formatCountdown(remaining)}
          </span>
          <span className="text-xs text-muted-foreground">Answers so far are submitted at 0:00.</span>
        </section>
      )}
      <section className="flex flex-col border border-border bg-card">
        <div className="flex flex-col gap-2.5 p-5 pb-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-bold">Your progress</h2>
            <span className="font-mono text-[13px] tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <ProgressBar answered={answered} total={total} />
        </div>
        <div className="grid grid-cols-2 gap-px border-y border-border bg-border">
          <StatCell label="Answered" value={answered} accent />
          <StatCell label="Not answered" value={total - answered} />
        </div>
        <div className="p-5 pb-4">
          <QuizNavigatorGrid sections={sections} onJump={onJump} />
        </div>
        <div className="px-5 pb-4">
          <Legend />
        </div>
      </section>
    </aside>
  );
}
