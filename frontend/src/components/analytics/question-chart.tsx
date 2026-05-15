import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { QuestionStat } from "@/types";

interface QuestionChartProps {
  question: QuestionStat;
}

const COLORS = ["#6366f1", "#818cf8", "#4f46e5", "#4338ca", "#3730a3"];

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

      {data.length > 0 ? (
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
              width={150}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(val: number, _: string, props: { payload?: { pct?: number } }) => [
                `${val} (${props.payload?.pct ?? 0}%)`,
                "Votes",
              ]}
              cursor={{ fill: "var(--muted)" }}
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
