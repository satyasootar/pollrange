import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Radio,
  Users,
  TrendingUp,
  CheckSquare,
  Lock,
  Unlock,
  Download,
  Camera,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyticsApi } from "@/api/analytics.api";
import { config } from "@/config/config";
import { useFullAnalytics } from "@/hooks/use-analytics";
import { usePoll, usePublishPoll, useClosePoll, useReopenPoll, useRegenerateToken } from "@/hooks/use-polls";
import { usePollSocket } from "@/hooks/use-poll-socket";
import { useQueryClient } from "@tanstack/react-query";
import { analyticsKeys } from "@/hooks/use-analytics";
import { pollKeys } from "@/hooks/use-polls";
import { QuestionChart } from "@/components/analytics/question-chart";
import { TimelineChart } from "@/components/analytics/timeline-chart";
import { ErrorBoundary } from "@/components/error-boundary";
import { OverviewCards } from "@/components/analytics/overview-cards";
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";
import { SnapshotDialog } from "@/components/analytics/snapshot-dialog";
import { buildShareUrl, copyToClipboard, formatDatetime } from "@/lib/utils";
import { toast } from "sonner";
import { stagger, fadeUp } from "@/lib/animations";
import type { AnalyticsUpdatePayload } from "@/types";

export function AnalyticsPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [realtimeCount, setRealtimeCount] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  const { data: poll } = usePoll(pollId!);
  const { data: analytics, isLoading } = useFullAnalytics(pollId!);
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
    } catch (error) {
      toast.error("Failed to export data");
    }
  };
  
  const handleSnapshot = () => {
    setIsSnapshotOpen(true);
  };

  if (isLoading) return <AnalyticsSkeleton />;
  if (!analytics || !poll) return null;

  const totalResponses = realtimeCount ?? analytics.totalResponses;

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
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 gap-1.5 sm:flex-none">
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSnapshot} className="flex-1 gap-1.5 sm:flex-none">
            <Camera className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Snapshot</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1 gap-1.5 sm:flex-none">
            <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy Link</span><span className="sm:hidden">Copy</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerateToken.mutate()}
            disabled={regenerateToken.isPending}
            className="flex-none"
            title="Regenerate Link"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${regenerateToken.isPending ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-none"
            onClick={() => window.open(`/p/${poll.shareToken}`, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          {poll.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => close.mutate()}
              disabled={close.isPending}
              className="flex-1 gap-1.5 sm:flex-none"
            >
              <Lock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Close Poll</span><span className="sm:hidden">Close</span>
            </Button>
          )}
          {poll.status === "closed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reopen.mutate()}
              disabled={reopen.isPending}
              className="flex-1 gap-1.5 sm:flex-none"
            >
              <Unlock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Reopen Poll</span><span className="sm:hidden">Reopen</span>
            </Button>
          )}
          {(poll.status === "closed" || poll.status === "active") && (
            <Button
              size="sm"
              onClick={() => publish.mutate()}
              disabled={publish.isPending}
              className="flex-1 gap-1.5 sm:flex-none"
            >
              <Unlock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Publish Results</span><span className="sm:hidden">Publish</span>
            </Button>
          )}
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
        </motion.div>
      </div>

      <SnapshotDialog 
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        analytics={analytics}
        shareUrl={shareUrl}
      />
    </div>
  );
}
