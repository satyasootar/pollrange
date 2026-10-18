import { useState } from "react";
import { EyeOff, Link2, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFormLeaderboard, usePublishResults, useUnpublishResults } from "@/hooks/use-forms";
import { useCountdown } from "@/hooks/use-countdown";
import { buildFormShareUrl, copyToClipboard, formatCountdown, formatDatetime } from "@/lib/utils";
import { Leaderboard } from "./leaderboard";
import type { CreatorLeaderboard, Form } from "@/types";

function statusLine(board: CreatorLeaderboard, remaining: number | null) {
  if (board.resultsPublished)
    return `Published ${formatDatetime(board.resultsPublishedAt)}. Everyone with the quiz link sees the leaderboard, their rank and the correct answers.`;
  if (board.status === "active" && remaining !== null && remaining > 0)
    return board.autoPublishResults
      ? `Publishes automatically when the timer ends, in ${formatCountdown(remaining)}.`
      : `The quiz ends in ${formatCountdown(remaining)}. Publish whenever you're ready.`;
  if (board.status === "active") return "The quiz is still open. Publishing closes it to new responses.";
  return "The quiz is closed. Publish to show everyone the leaderboard.";
}

/** Creator's Leaderboard tab: live ranking (with emails) and the publish / hide controls. */
export function LeaderboardPanel({ form }: { form: Form }) {
  const { data: board, isLoading } = useFormLeaderboard(form._id);
  const publish = usePublishResults(form._id);
  const unpublish = useUnpublishResults(form._id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Bumped on publish so the podium remounts and fires its confetti.
  const [celebration, setCelebration] = useState(0);
  const remaining = useCountdown(board?.status === "active" ? board.expiresAt : undefined);

  if (isLoading || !board) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const published = board.resultsPublished;
  const copyLink = async () => {
    await copyToClipboard(buildFormShareUrl(form.shareToken));
    toast.success("Quiz link copied. Results show on the same link.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
              published ? "border-amber-400/50 bg-amber-400/15 text-amber-500" : "border-border text-muted-foreground"
            }`}
          >
            {published ? <Trophy className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </span>
          <div>
            <p className="font-semibold">{published ? "Results are live" : "Results are hidden from respondents"}</p>
            <p className="text-sm text-muted-foreground">{statusLine(board, remaining)}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={copyLink}>
            <Link2 className="h-4 w-4" /> Copy link
          </Button>
          {published ? (
            <Button variant="outline" size="sm" onClick={() => unpublish.mutate()} disabled={unpublish.isPending}>
              {unpublish.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Hide results
            </Button>
          ) : (
            <Button size="sm" className="gap-2" onClick={() => setConfirmOpen(true)} disabled={board.participants === 0}>
              <Trophy className="h-4 w-4" /> Publish results
            </Button>
          )}
        </div>
      </div>

      <div className="border border-border bg-card p-4 sm:p-6">
        <Leaderboard
          key={celebration}
          entries={board.entries}
          participants={board.participants}
          maxPoints={board.maxPoints}
          showEmail
          celebrate={celebration > 0}
        />
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish quiz results?</DialogTitle>
            <DialogDescription>
              {board.status === "active" ? "This closes the quiz to new responses. " : ""}
              Everyone with the quiz link will see the leaderboard (names and scores), their own rank and the correct answers. You
              can hide the results again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={publish.isPending}
              onClick={() =>
                publish.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmOpen(false);
                    setCelebration((n) => n + 1);
                  },
                })
              }
            >
              {publish.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Publish results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
