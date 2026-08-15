import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Radio,
  Lock,
  Unlock,
  Download,
  Camera,
  RefreshCcw,
  MoreVertical,
  QrCode,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Zap
} from "lucide-react";
import { analyticsApi } from "@/api/analytics.api";
import { useFullAnalytics, useRespondents } from "@/hooks/use-analytics";
import { usePoll, usePublishPoll, useClosePoll, useReopenPoll, useRegenerateToken } from "@/hooks/use-polls";
import { usePollSocket } from "@/hooks/use-poll-socket";
import { useQueryClient } from "@tanstack/react-query";
import { analyticsKeys } from "@/hooks/use-analytics";
import { pollKeys } from "@/hooks/use-polls";
import { QuestionChart } from "@/components/analytics/question-chart";
import { TimelineChart } from "@/components/analytics/timeline-chart";
import { OverviewCards } from "@/components/analytics/overview-cards";
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";
import { SnapshotDialog } from "@/components/analytics/snapshot-dialog";
import { QRCardDialog } from "@/components/analytics/qr-card-dialog";
import { RespondentsList } from "@/components/analytics/respondents-list";
import { ReopenPollDialog } from "@/components/analytics/reopen-poll-dialog";
import { useAuthStore } from "@/store/use-auth-store";
import { buildShareUrl, copyToClipboard, formatDatetime } from "@/lib/utils";
import { toast } from "sonner";
import { stagger, fadeUp } from "@/lib/animations";
import type { AnalyticsUpdatePayload } from "@/types";

export function AnalyticsPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [realtimeCount, setRealtimeCount] = useState<number | null>(null);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [isQRCardOpen, setIsQRCardOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);

  const { data: poll } = usePoll(pollId!);
  const { data: analytics, isLoading } = useFullAnalytics(pollId!);
  const isAuthenticatedPoll = poll?.responseMode === "authenticated";
  const { data: respondents, isLoading: isRespondentsLoading } = useRespondents(
    pollId!,
    isAuthenticatedPoll
  );
  const publish = usePublishPoll(pollId!);
  const close = useClosePoll(pollId!);
  const reopen = useReopenPoll(pollId!);
  const regenerateToken = useRegenerateToken(pollId!);

  // Realtime socket integration
  const handleAnalyticsUpdate = useCallback(
    (data: AnalyticsUpdatePayload) => {
      setRealtimeCount(data.totalResponses);
      // Invalidate and refetch analytics
      qc.invalidateQueries({ queryKey: analyticsKeys.full(pollId!) });
    },
    [pollId, qc]
  );

  const { isConnected } = usePollSocket({
    pollId: pollId!,
    onAnalyticsUpdate: handleAnalyticsUpdate,
    onNewResponse: (data) => setRealtimeCount(data.totalResponses),
    onStatusChange: (data) => {
      qc.invalidateQueries({ queryKey: pollKeys.detail(pollId!) });
      toast.info(`Poll status changed to: ${data.status}`);
    },
  });

  const shareUrl = poll ? buildShareUrl(poll.shareToken) : "";

  const handleCopy = async () => {
    await copyToClipboard(shareUrl);
    toast.success("Share link copied!");
  };

  const handleExport = async () => {
    try {
      const response = await analyticsApi.exportData(pollId!, "csv");
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `poll-${pollId}-results.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Data exported successfully!");
    } catch {
      toast.error("Failed to export data");
    }
  };
  
  const handleSnapshot = () => {
    setIsSnapshotOpen(true);
  };

  if (isLoading) return <AnalyticsSkeleton />;
  if (!analytics || !poll) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 flex-col gap-4 border-b border-border px-4 py-4 md:px-8 lg:h-20 lg:flex-row lg:items-center lg:py-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold">{analytics.pollTitle}</h1>
              {isConnected && poll.status === "active" && (
                <span className="flex items-center gap-1 rounded-none border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                  <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Expires {formatDatetime(analytics.expiresAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 lg:ml-auto">
          {/* External Link */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            onClick={() => window.open(shareUrl, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>

          {/* Copy Link - Outside as requested */}
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy Link</span><span className="sm:hidden">Copy</span>
          </Button>

          {/* Publish Results Dropdown */}
          {(poll.status === "closed" || poll.status === "active") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  disabled={publish.isPending}
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Publish Results</span>
                  <span className="sm:hidden">Publish</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => publish.mutate("permanent")} className="flex flex-col items-start py-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Lock className="h-3.5 w-3.5" />
                    <span>End & Publish</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Closes poll and makes results public permanently.</p>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => publish.mutate("live")} className="flex flex-col items-start py-2">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Publish Live</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Share live results while keeping the poll active.</p>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsQRCardOpen(true)}>
                <QrCode className="mr-2 h-4 w-4" />
                <span>QR Code</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSnapshot}>
                <Camera className="mr-2 h-4 w-4" />
                <span>Take Snapshot</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export CSV</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => regenerateToken.mutate()}
                disabled={regenerateToken.isPending}
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${regenerateToken.isPending ? "animate-spin" : ""}`} />
                <span>Regenerate Link</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {poll.status === "active" ? (
                <DropdownMenuItem 
                  onClick={() => close.mutate()}
                  className="text-destructive focus:text-destructive"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  <span>Close Poll</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setIsReopenOpen(true)}>
                  <Unlock className="mr-2 h-4 w-4" />
                  <span>Reopen Poll</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Overview cards */}
          <motion.div variants={fadeUp}>
            <OverviewCards analytics={analytics} realtimeTotal={realtimeCount} />
          </motion.div>

          {/* Per-question charts */}
          {analytics.questions.map((q) => (
            <motion.div key={q.questionId} variants={fadeUp}>
              <QuestionChart question={q} />
            </motion.div>
          ))}

          {/* Timeline */}
          {analytics.timeline.length > 0 && (
            <motion.div variants={fadeUp}>
              <TimelineChart data={analytics.timeline} />
            </motion.div>
          )}

          {/* Respondents (authenticated polls only — shows who answered and when) */}
          {isAuthenticatedPoll && (
            <motion.div variants={fadeUp}>
              <RespondentsList
                respondents={respondents ?? []}
                isLoading={isRespondentsLoading}
              />
            </motion.div>
          )}
        </motion.div>
      </div>

      <SnapshotDialog 
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        analytics={analytics}
        shareUrl={shareUrl}
      />

      <ReopenPollDialog
        open={isReopenOpen}
        onOpenChange={setIsReopenOpen}
        isPending={reopen.isPending}
        onConfirm={(expiresAt) =>
          reopen.mutate(expiresAt, { onSuccess: () => setIsReopenOpen(false) })
        }
      />

      {isQRCardOpen && (
        <QRCardDialog
          pollId={pollId!}
          shareToken={poll.shareToken}
          pollTitle={poll.title}
          defaultBranding={user?.branding}
          open={isQRCardOpen}
          onOpenChange={setIsQRCardOpen}
        />
      )}
    </div>
  );
}
