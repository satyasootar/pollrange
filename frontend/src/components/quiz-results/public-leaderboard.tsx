import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Crosshair, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuizLeaderboardPage } from "@/hooks/use-public-form";
import { cn, formatCountdown } from "@/lib/utils";
import { Avatar, YouBadge } from "./leaderboard";
import { ConfettiBurst } from "./confetti-burst";
import type { LeaderboardEntry, QuizResults } from "@/types";

const MEDAL: Record<number, { border: string; text: string; height: string }> = {
  1: { border: "border-amber-400", text: "text-amber-500", height: "h-20 sm:h-24" },
  2: { border: "border-slate-300", text: "text-slate-400", height: "h-14 sm:h-16" },
  3: { border: "border-orange-400", text: "text-orange-500", height: "h-10 sm:h-12" },
};

function Podium({ top, maxPoints, celebrate }: { top: LeaderboardEntry[]; maxPoints: number; celebrate: boolean }) {
  // Classic order: 2nd, 1st, 3rd.
  const order = [top[1], top[0], top[2]].filter((e): e is LeaderboardEntry => !!e);
  return (
    <ol aria-label="Top three" className="grid grid-cols-3 items-end gap-2 sm:gap-3">
      {order.map((e, i) => {
        const medal = MEDAL[e.rank] ?? MEDAL[3]!;
        const first = e === top[0];
        return (
          <motion.li
            key={`${e.rank}-${e.name}-${e.submittedAt}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * i, duration: 0.4 }}
            className="relative flex min-w-0 flex-col items-center gap-1.5 text-center"
            aria-label={`Rank ${e.rank}: ${e.name}, ${e.score} of ${maxPoints} points`}
          >
            {celebrate && first && <ConfettiBurst scale={1.1} delay={0.5} />}
            <Avatar name={e.name} className={cn("border-2", medal.border, first ? "h-14 w-14 text-base" : "h-11 w-11 text-sm")} />
            <p className="flex w-full items-center justify-center truncate px-1 text-xs font-semibold sm:text-sm">
              <span className="truncate">{e.name}</span>
            </p>
            {e.isMe && <YouBadge />}
            <div className={cn("flex w-full flex-col items-center justify-center border-t-[3px] bg-muted/50", medal.border, medal.height)}>
              <span className={cn("text-lg font-bold tabular-nums sm:text-2xl", medal.text)}>{e.rank}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {e.score} pts{e.timeTakenMs != null ? ` · ${formatCountdown(e.timeTakenMs)}` : ""}
              </span>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

function Row({ entry, maxPoints }: { entry: LeaderboardEntry; maxPoints: number }) {
  const medal = MEDAL[entry.rank];
  return (
    <li
      className={cn(
        "flex items-center gap-3 border-t px-4 py-3 sm:px-5",
        entry.isMe ? "border-y border-primary bg-primary/10" : "border-border"
      )}
    >
      <span
        className={cn(
          "w-10 shrink-0 text-sm tabular-nums",
          entry.isMe ? "font-bold text-primary" : medal ? cn("font-bold", medal.text) : "text-muted-foreground"
        )}
      >
        #{entry.rank}
      </span>
      <Avatar name={entry.name} className={cn("h-8 w-8 text-xs", entry.isMe && "bg-primary text-primary-foreground")} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center text-sm font-medium">
          <span className="truncate">{entry.name}</span>
          {entry.isMe && <YouBadge />}
        </p>
        {entry.timeTakenMs != null && (
          <p className="text-xs tabular-nums text-muted-foreground">{formatCountdown(entry.timeTakenMs)} taken</p>
        )}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {entry.score}
        <span className="font-normal text-muted-foreground">/{maxPoints}</span>
      </span>
    </li>
  );
}

/**
 * Public quiz leaderboard that scales to any size: a compact podium, then the board
 * one page at a time with a "jump to me" shortcut. Small quizzes (< 3 people) skip the podium.
 */
export function PublicLeaderboard({
  board,
  shareToken,
  sessionToken,
  celebrate = false,
}: {
  board: NonNullable<QuizResults["leaderboard"]>;
  shareToken: string;
  sessionToken: string | undefined;
  celebrate?: boolean;
}) {
  const { participants, maxPoints, pageSize, myPosition } = board;
  const myPage = myPosition !== undefined ? Math.floor(myPosition / pageSize) : undefined;
  // Land on the viewer's own neighbourhood when they're off the first page.
  const [page, setPage] = useState(myPage ?? 0);
  const pages = Math.max(1, Math.ceil(participants / pageSize));
  const { data, isFetching } = useQuizLeaderboardPage(shareToken, sessionToken, page, pageSize, {
    participants,
    offset: 0,
    entries: board.entries,
  });
  const showPodium = participants >= 3;
  // The podium already shows ranks 1–3, so the first page's list starts after them.
  const rows = (data?.entries ?? []).slice(page === 0 && showPodium ? 3 : 0);

  if (participants === 0) {
    return (
      <section className="border border-dashed border-border px-6 py-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No one took this quiz</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="leaderboard-heading" className="border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <h2 id="leaderboard-heading" className="flex items-center gap-2 text-base font-bold">
          <Trophy className="h-5 w-5 text-amber-500" /> Leaderboard
          <span className="text-sm font-normal text-muted-foreground">
            · {participants} {participants === 1 ? "person" : "people"}
          </span>
        </h2>
        {myPage !== undefined && pages > 1 && (
          <Button size="sm" onClick={() => setPage(myPage)} disabled={page === myPage} className="gap-1.5">
            <Crosshair className="h-3.5 w-3.5" /> Jump to me
          </Button>
        )}
      </div>

      {showPodium && (
        <div className="px-4 pb-5 sm:px-5">
          <Podium top={board.entries.slice(0, 3)} maxPoints={maxPoints} celebrate={celebrate} />
        </div>
      )}

      <ol className={cn("transition-opacity", isFetching && "opacity-60")} aria-label={`Ranks, page ${page + 1} of ${pages}`}>
        {rows.map((e) => (
          <Row key={`${e.rank}-${e.name}-${e.submittedAt}`} entry={e} maxPoints={maxPoints} />
        ))}
      </ol>

      <nav
        aria-label="Leaderboard pages"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5"
      >
        <span className="text-xs text-muted-foreground">Same score? The faster time ranks higher</span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-20 text-center text-xs tabular-nums text-muted-foreground">
              {isFetching ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : `Page ${page + 1} of ${pages}`}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </nav>
    </section>
  );
}
