import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { usePublishedResults } from "@/hooks/use-public-poll";
import { QuestionChart } from "@/components/analytics/question-chart";
import { WordCloudWidget } from "@/components/analytics/word-cloud-widget";
import { fadeUp, stagger } from "@/lib/animations";
import { Users, CheckSquare } from "lucide-react";
import type { QuestionStat } from "@/types";

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
        <div className="text-center">
          <p className="text-muted-foreground">Results not available.</p>
        </div>
      </div>
    );
  }

  // Build question stats from public results structure
  const questions: QuestionStat[] = (poll.questions as unknown as QuestionStat[]) ?? [];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
          {/* Header */}
          <motion.div variants={fadeUp} className="border border-border bg-card p-6">
            <p className="mb-1 text-xs font-medium text-primary uppercase tracking-wider">
              Published Results
            </p>
            <h1 className="text-2xl font-bold">{poll.title}</h1>
            {poll.description && (
              <p className="mt-2 text-sm text-muted-foreground">{poll.description}</p>
            )}
            <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {poll.totalResponses} total responses
              </span>
            </div>
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
