import { useState } from "react";
import { Loader2, Play, Plus, Radio, Square, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCountdown } from "@/hooks/use-countdown";
import { useQuizLiveSocket, useQuizLobbyCount } from "@/hooks/use-quiz-live";
import { useEndLiveQuiz, useExtendLiveQuiz, useStartLiveQuiz } from "@/hooks/use-forms";
import { cn, formatCountdown, formatDatetime } from "@/lib/utils";
import type { Form, QuizLiveState } from "@/types";

function Eyebrow({ children, live }: { children: React.ReactNode; live?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-primary uppercase">
      {live ? (
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
        </span>
      ) : (
        <Radio className="h-3.5 w-3.5" aria-hidden />
      )}
      {children}
    </span>
  );
}

/**
 * Host controls for a live quiz: lobby → Start for everyone → +time / End now → ended.
 * State comes from the form (server truth) and is kept current by the live socket push.
 */
export function LiveQuizControl({ form, responses }: { form: Form; responses: number }) {
  const start = useStartLiveQuiz(form._id);
  const extend = useExtendLiveQuiz(form._id);
  const end = useEndLiveQuiz(form._id);
  const [lobby, setLobby] = useState(0);
  const [pushed, setPushed] = useState<QuizLiveState | null>(null);
  const [minutes, setMinutes] = useState<number | "">(form.quizTimer?.durationMinutes ?? 30);
  const [confirm, setConfirm] = useState<"start" | "end" | null>(null);

  // The host's form room receives the same live push as takers (e.g. +time from another tab).
  useQuizLiveSocket(form._id, setPushed, false);
  useQuizLobbyCount(form._id, setLobby);

  const startedAt = pushed?.startedAt ?? form.liveStartedAt;
  const endsAt = pushed?.endsAt ?? form.expiresAt;
  const state = pushed?.state ?? (form.status !== "active" ? "ended" : form.liveStartedAt ? "running" : "waiting");
  const remaining = useCountdown(state === "running" ? endsAt ?? undefined : undefined, pushed?.serverTime);
  const timeUp = state === "running" && remaining === 0;

  const minutesValid = typeof minutes === "number" && minutes >= 1 && minutes <= 600;

  return (
    <section
      aria-label="Live quiz control"
      className={cn("mb-6 border-2 bg-card p-5 sm:p-6", state === "running" && !timeUp ? "border-destructive/50" : "border-primary/40")}
    >
      {state === "waiting" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <Eyebrow>Live quiz · waiting to start</Eyebrow>
              <p className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold tabular-nums">{lobby}</span>
                <span className="text-sm text-muted-foreground">{lobby === 1 ? "person" : "people"} in the lobby</span>
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="live-minutes" className="text-xs text-muted-foreground">
                  Minutes
                </Label>
                <Input
                  id="live-minutes"
                  type="number"
                  min={1}
                  max={600}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value === "" ? "" : Math.floor(Number(e.target.value)))}
                  className="h-11 w-24"
                />
              </div>
              <Button size="lg" className="h-11 gap-2 font-bold" disabled={!minutesValid || start.isPending} onClick={() => setConfirm("start")}>
                <Play className="h-4 w-4" aria-hidden /> Start quiz for everyone
              </Button>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Share the quiz link now. People who open it wait here until you start, then everyone's timer begins at the same moment.
            Late joiners get the time that's left.
          </p>
        </div>
      )}

      {state === "running" && !timeUp && (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <Eyebrow live>Live now</Eyebrow>
            <span role="timer" className="font-mono text-5xl leading-none font-bold tabular-nums sm:text-6xl">
              {remaining !== null ? formatCountdown(remaining) : "…"}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                <strong className="font-mono text-foreground tabular-nums">{responses}</strong> submitted
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden />
                <strong className="font-mono text-foreground tabular-nums">{lobby}</strong> on the quiz page
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 5].map((m) => (
              <Button key={m} variant="outline" className="h-11 gap-1.5" disabled={extend.isPending} onClick={() => extend.mutate(m)}>
                <Plus className="h-4 w-4" aria-hidden /> {m} min
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-11 gap-1.5 border-destructive/60 text-destructive hover:bg-destructive/10"
              disabled={end.isPending}
              onClick={() => setConfirm("end")}
            >
              <Square className="h-4 w-4" aria-hidden /> End now
            </Button>
          </div>
        </div>
      )}

      {(state === "ended" || timeUp) && (
        <div className="flex flex-col gap-1">
          <Eyebrow>Live quiz · ended</Eyebrow>
          <p className="text-lg font-semibold">
            {responses} {responses === 1 ? "person" : "people"} submitted
          </p>
          <p className="text-sm text-muted-foreground">
            {startedAt ? `Started ${formatDatetime(startedAt)}` : "Never started"}
            {endsAt ? ` · ended ${formatDatetime(endsAt)}` : ""}.{" "}
            {form.isResultsPublic || form.status === "published"
              ? "Results are published on the quiz link."
              : "Publish the results from the Leaderboard tab when you're ready."}
          </p>
        </div>
      )}

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === "start" ? "Start the quiz for everyone?" : "End the quiz now?"}</DialogTitle>
            <DialogDescription>
              {confirm === "start"
                ? `Everyone gets ${minutes} minutes, starting now. You can add time or end it early.`
                : "Everyone's timer stops now and the answers they have are submitted. Nobody can take the quiz after this."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm === "end" ? "destructive" : "default"}
              disabled={start.isPending || end.isPending}
              onClick={() => {
                const done = { onSettled: () => setConfirm(null) };
                if (confirm === "start") start.mutate(minutesValid ? (minutes as number) : undefined, done);
                else end.mutate(undefined, done);
              }}
            >
              {(start.isPending || end.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirm === "start" ? "Start now" : "End quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
