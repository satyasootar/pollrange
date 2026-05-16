import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MoreHorizontal,
  BarChart3,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  Radio,
  RotateCcw,
  RefreshCw,
  Lock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Poll, PollStatus } from "@/types";
import { timeUntilExpiry, buildShareUrl, copyToClipboard, formatDate, cn } from "@/lib/utils";
import { useDeletePoll, useClosePoll, useReopenPoll, useRegenerateToken } from "@/hooks/use-polls";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { toast } from "sonner";
import { cardHover } from "@/lib/animations";

const STATUS_CONFIG: Record<
  PollStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400",
  },
  active: {
    label: "Active",
    className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  },
  closed: {
    label: "Closed",
    className: "border-border bg-muted text-muted-foreground",
  },
  published: {
    label: "Published",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
};

interface PollCardProps {
  poll: Poll;
  isCompact?: boolean;
  onSelect?: (pollId: string) => void;
}

export function PollCard({ poll, isCompact = false, onSelect }: PollCardProps) {
  const navigate = useNavigate();
  const deletePoll = useDeletePoll();
  const closePoll = useClosePoll(poll._id);
  const reopenPoll = useReopenPoll(poll._id);
  const regenerateToken = useRegenerateToken(poll._id);
  const removePoll = useDashboardStore((s) => s.removePoll);
  const statusCfg = STATUS_CONFIG[poll.status];
  const shareUrl = buildShareUrl(poll.shareToken);

  const handleCopyLink = async () => {
    await copyToClipboard(shareUrl);
    toast.success("Share link copied!");
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${poll.title}"? This cannot be undone.`)) return;
    removePoll(poll._id); // Instant UI update
    deletePoll.mutate(poll._id);
  };

  return (
    <motion.div
      className="group flex flex-col border border-border bg-card cursor-pointer shadow-none hover:border-primary/50"
      initial="rest"
      whileHover="hover"
      variants={cardHover}
      onClick={() => onSelect ? onSelect(poll._id) : navigate(`/polls/${poll._id}/analytics`)}
    >
      {/* Header */}
      <div className={cn("flex items-start justify-between p-5 pb-3", isCompact && "p-3 pb-2")}>
        <div className="flex-1 min-w-0 pr-2">
          <span
            className={cn(`inline-flex items-center border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`, isCompact && "text-[10px] px-1.5")}
          >
            {poll.status === "active" && (
              <Radio className="mr-1 h-2.5 w-2.5 animate-pulse" />
            )}
            {statusCfg.label}
          </span>
          <h3
            className={cn("mt-2 line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary", isCompact && "text-sm mt-1")}
          >
            {poll.title}
          </h3>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/polls/${poll._id}/analytics`)}>
                <BarChart3 className="mr-2 h-4 w-4" /> View Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" /> Copy Share Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(`/p/${poll.shareToken}`, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Open Poll
              </DropdownMenuItem>
              
              {poll.status === "published" && (
                <>
                  <DropdownMenuItem onClick={async () => {
                    await copyToClipboard(`${shareUrl}/results`);
                    toast.success("Results link copied!");
                  }}>
                    <Copy className="mr-2 h-4 w-4" /> Copy Results Link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => window.open(`/p/${poll.shareToken}/results`, "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> Open Results
                  </DropdownMenuItem>
                </>
              )}
              {poll.status === "draft" && (
                <DropdownMenuItem onClick={() => navigate(`/polls/${poll._id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}

              {poll.status === "active" && (
                <DropdownMenuItem onClick={() => {
                  if (confirm("Are you sure you want to close this poll?")) closePoll.mutate();
                }}>
                  <Lock className="mr-2 h-4 w-4" /> Close Poll
                </DropdownMenuItem>
              )}

              {poll.status === "closed" && (
                <DropdownMenuItem onClick={() => reopenPoll.mutate()}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reopen Poll
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => {
                if (confirm("Regenerate share link? The old link will stop working.")) regenerateToken.mutate();
              }}>
                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Link
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className={cn("flex items-center gap-4 px-5 pb-4 text-sm text-muted-foreground", isCompact && "px-3 pb-3 text-xs gap-2")}>
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5" />
          {poll.totalResponses} response{poll.totalResponses !== 1 ? "s" : ""}
        </span>
        <span>•</span>
        <span>{poll.questions.length} question{poll.questions.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Footer */}
      <div className={cn("mt-auto flex items-center justify-between border-t border-border px-5 py-3", isCompact && "px-3 py-2")}>
        <span className="text-xs text-muted-foreground">
          {poll.status === "active"
            ? (isCompact ? "Expires soon" : `Expires ${timeUntilExpiry(poll.expiresAt)}`)
            : (isCompact ? formatDate(poll.createdAt) : `Created ${formatDate(poll.createdAt)}`)}
        </span>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className={cn("h-7 gap-1.5 px-2 text-xs", isCompact && "h-6 px-1.5 text-[10px]")}
            onClick={() => navigate(`/polls/${poll._id}/analytics`)}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Button>
          
          {poll.status === "published" && (
            <Button
              size="sm"
              variant="ghost"
              className={cn("h-7 gap-1.5 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10", isCompact && "h-6 px-1.5 text-[10px]")}
              onClick={() => window.open(`/p/${poll.shareToken}/results`, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Results
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
