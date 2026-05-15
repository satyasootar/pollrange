import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { usePublishedResults } from "@/hooks/use-public-poll";
import { QuestionChart } from "@/components/analytics/question-chart";
import { ErrorBoundary } from "@/components/error-boundary";
import { fadeUp, stagger } from "@/lib/animations";
import { Users } from "lucide-react";
import type { FullAnalytics } from "@/types";

export function PublishedResultsPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { data: poll, isLoading } = usePublishedResults(shareToken!);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center border border-border bg-card p-10 max-w-sm">
          <p className="text-muted-foreground">Results not available or poll not found.</p>
        </div>
      </div>
    );
  }

  // The backend returns a structure similar to FullAnalytics for public results
  const analytics = poll as unknown as FullAnalytics;
  const questions = analytics.questions || [];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
          {/* Header */}
          <motion.div variants={fadeUp} className="border border-border bg-card p-6">
            <div className="mb-2 inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
              </span>
              Public Results
            </div>
            <h1 className="text-2xl font-bold">{analytics.pollTitle}</h1>
            {analytics.totalResponses > 0 && (
              <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {analytics.totalResponses} responses recorded
                </span>
              </div>
            )}
          </motion.div>

          {/* Charts */}
          {questions.map((q) => (
            <motion.div key={q.questionId} variants={fadeUp}>
              <QuestionChart question={q} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
