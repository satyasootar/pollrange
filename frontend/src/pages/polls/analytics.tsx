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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFullAnalytics } from "@/hooks/use-analytics";
import { usePoll, usePublishPoll, useClosePoll } from "@/hooks/use-polls";
import { usePollSocket } from "@/hooks/use-poll-socket";
import { useQueryClient } from "@tanstack/react-query";
import { analyticsKeys } from "@/hooks/use-analytics";
import { pollKeys } from "@/hooks/use-polls";
import { QuestionChart } from "@/components/analytics/question-chart";
import { TimelineChart } from "@/components/analytics/timeline-chart";
import { WordCloudWidget } from "@/components/analytics/word-cloud-widget";
import { OverviewCards } from "@/components/analytics/overview-cards";
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";
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

  const { data: poll } = usePoll(pollId!);
  const { data: analytics, isLoading } = useFullAnalytics(pollId!);
  const publish = usePublishPoll(pollId!);
  const close = useClosePoll(pollId!);

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

  if (isLoading) return <AnalyticsSkeleton />;
  if (!analytics || !poll) return null;

  const totalResponses = realtimeCount ?? analytics.totalResponses;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-border px-8 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </Button>
          <Button
            variant="outline"
            size="sm"
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
              className="gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" /> Close Poll
            </Button>
          )}
          {(poll.status === "closed" || poll.status === "active") && (
            <Button
              size="sm"
              onClick={() => publish.mutate()}
              disabled={publish.isPending}
              className="gap-1.5"
            >
              <Unlock className="h-3.5 w-3.5" /> Publish Results
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
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

          {/* Word cloud */}
          {analytics.wordCloudData.length > 0 && (
            <motion.div variants={fadeUp}>
              <WordCloudWidget words={analytics.wordCloudData} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
