import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, MessageSquare } from "lucide-react";
import type { QuestionStat } from "@/types";
import { WordCloudWidget } from "./word-cloud-widget";
import { ErrorBoundary } from "../error-boundary";

interface QuestionChartProps {
  question: QuestionStat;
}

const COLORS = ["#6366f1", "#818cf8", "#4f46e5", "#4338ca", "#3730a3"];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-none border border-border bg-popover/90 p-2 shadow-xl backdrop-blur-md ring-1 ring-white/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Result</p>
        <p className="text-sm font-semibold text-foreground">{data.name}</p>
        <p className="text-xs text-primary font-medium mt-1">
          {data.count} {data.count === 1 ? 'vote' : 'votes'} · {data.pct}%
        </p>
      </div>
    );
  }
  return null;
};

export function QuestionChart({ question }: QuestionChartProps) {
  const data = question.options.map((o) => ({
    name: o.optionText,
    count: o.count,
    pct: o.percentage,
  }));

  return (
    <div className="border border-border bg-card p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold leading-snug">
            {question.questionText}
            {question.isMandatory && (
              <span className="ml-1 text-destructive text-xs">*</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {question.responseCount} responses · {question.skippedCount} skipped
          </p>
        </div>
        {question.topOption && (
          <div className="shrink-0 border border-primary/30 bg-primary/10 px-2 py-1 text-right">
            <p className="text-xs text-muted-foreground">Top answer</p>
            <p className="text-xs font-semibold text-primary truncate max-w-[140px]">
              {question.topOption.optionText}
            </p>
          </div>
        )}
      </div>

      {question.type === "open_ended" ? (
        <div className="py-2">
          {question.wordCloudData && question.wordCloudData.length > 0 ? (
            <div className="rounded-none border border-border/50 bg-muted/5 p-2">
               <ErrorBoundary>
                <WordCloudWidget words={question.wordCloudData} />
              </ErrorBoundary>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                No open-ended responses yet.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Word cloud will appear once users submit text responses.
              </p>
            </div>
          )}
        </div>
      ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            />
            <Bar dataKey="count" radius={0} maxBarSize={28}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground italic">No responses yet.</p>
      )}
    </div>
  );
}
