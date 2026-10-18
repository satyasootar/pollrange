import { motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfettiBurst } from "./confetti-burst";
import type { LeaderboardEntry } from "@/types";

const PODIUM: Record<number, { ring: string; badge: string; pedestal: string; height: string; place: string }> = {
  1: { ring: "ring-amber-400", badge: "bg-amber-400 text-amber-950", pedestal: "border-amber-400/60 bg-amber-400/15", height: "h-24 sm:h-28", place: "1st" },
  2: { ring: "ring-slate-300", badge: "bg-slate-300 text-slate-900", pedestal: "border-slate-300/60 bg-slate-300/15", height: "h-16 sm:h-20", place: "2nd" },
  3: { ring: "ring-orange-400", badge: "bg-orange-400 text-orange-950", pedestal: "border-orange-400/60 bg-orange-400/15", height: "h-12 sm:h-14", place: "3rd" },
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary", className)}
    >
      {initials(name)}
    </span>
  );
}

export function YouBadge() {
  return <span className="ml-1.5 border border-primary/40 bg-primary/10 px-1.5 py-px text-[10px] font-semibold uppercase text-primary">You</span>;
}

function PodiumSpot({ entry, maxPoints, celebrate, delay }: { entry: LeaderboardEntry; maxPoints: number; celebrate: boolean; delay: number }) {
  const style = PODIUM[entry.rank] ?? PODIUM[3]!;
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      className="relative flex min-w-0 flex-1 flex-col items-center justify-end"
      aria-label={`${style.place} place: ${entry.name}, ${entry.score} of ${maxPoints} points`}
    >
      {celebrate && <ConfettiBurst scale={entry.rank === 1 ? 1.25 : 0.85} delay={delay + 0.35} />}
      {entry.rank === 1 ? <Crown className="mb-1 h-6 w-6 text-amber-400" /> : <span className="mb-1 h-6" />}
      <Avatar
        name={entry.name}
        className={cn("ring-4 ring-offset-2 ring-offset-background", style.ring, entry.rank === 1 ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm")}
      />
      <p className="mt-2 w-full truncate px-1 text-center text-sm font-semibold">{entry.name}</p>
      {entry.isMe && <YouBadge />}
      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{entry.score}</span> / {maxPoints} pts
      </p>
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.5, ease: "easeOut" }}
        style={{ originY: 1 }}
        className={cn("mt-3 flex w-full items-start justify-center border-x-2 border-t-2 pt-2", style.pedestal, style.height)}
      >
        <span className={cn("flex h-7 w-7 items-center justify-center text-sm font-bold", style.badge)}>{entry.rank}</span>
      </motion.div>
    </motion.li>
  );
}

function Row({ entry, maxPoints, showEmail }: { entry: LeaderboardEntry; maxPoints: number; showEmail: boolean }) {
  const pct = maxPoints > 0 ? Math.round((entry.score / maxPoints) * 100) : 0;
  return (
    <li
      className={cn(
        "flex items-center gap-3 border px-3 py-2.5",
        entry.isMe ? "border-primary bg-primary/10" : "border-border bg-card"
      )}
    >
      <span className="w-9 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">#{entry.rank}</span>
      <Avatar name={entry.name} className="h-8 w-8 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center truncate text-sm font-medium">
          <span className="truncate">{entry.name}</span>
          {entry.isMe && <YouBadge />}
        </p>
        {showEmail && entry.email && <p className="truncate text-xs text-muted-foreground">{entry.email}</p>}
        <div className="mt-1.5 h-1 w-full bg-border" aria-hidden>
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {entry.score}
        <span className="font-normal text-muted-foreground">/{maxPoints}</span>
      </span>
    </li>
  );
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  participants: number;
  maxPoints: number;
  /** Fire confetti over the podium (on publish / first view). */
  celebrate?: boolean;
  /** Creator view: show respondent emails. */
  showEmail?: boolean;
  /** The viewer's own placing when it falls outside `entries`. */
  me?: { name: string; score: number; rank: number } | null;
}

export function Leaderboard({ entries, participants, maxPoints, celebrate = false, showEmail = false, me }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="border border-dashed border-border px-6 py-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No one has taken this quiz yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Rankings appear here as responses come in.</p>
      </div>
    );
  }

  const top = entries.slice(0, 3);
  // Classic podium order: 2nd, 1st, 3rd.
  const podium = [top[1], top[0], top[2]].filter((e): e is LeaderboardEntry => !!e);
  const rest = entries.slice(3);
  const meOutside = me && !entries.some((e) => e.isMe);

  return (
    <section aria-labelledby="leaderboard-heading" className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="leaderboard-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-amber-500" /> Leaderboard
        </h2>
        <span className="text-xs text-muted-foreground">
          {participants} participant{participants !== 1 ? "s" : ""}
        </span>
      </div>

      <ol className="flex items-end gap-2 border-b-2 border-border px-1 pt-10 sm:gap-4 sm:px-6" aria-label="Top three">
        {podium.map((entry) => (
          <PodiumSpot
            key={`${entry.rank}-${entry.name}-${entry.submittedAt}`}
            entry={entry}
            maxPoints={maxPoints}
            celebrate={celebrate}
            delay={entry === top[0] ? 0.3 : entry === top[1] ? 0.15 : 0.45}
          />
        ))}
      </ol>

      {(rest.length > 0 || meOutside) && (
        <ol className="space-y-2" start={4}>
          {rest.map((entry) => (
            <Row key={`${entry.rank}-${entry.name}-${entry.submittedAt}`} entry={entry} maxPoints={maxPoints} showEmail={showEmail} />
          ))}
          {meOutside && (
            <>
              <li aria-hidden className="py-1 text-center text-xs tracking-[0.3em] text-muted-foreground">
                •••
              </li>
              <Row
                entry={{ rank: me.rank, name: me.name, score: me.score, totalPoints: maxPoints, submittedAt: "", isMe: true }}
                maxPoints={maxPoints}
                showEmail={false}
              />
            </>
          )}
        </ol>
      )}

      {participants > entries.length && (
        <p className="text-center text-xs text-muted-foreground">
          Showing the top {entries.length} of {participants}.
        </p>
      )}
    </section>
  );
}
