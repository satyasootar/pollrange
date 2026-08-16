import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TimelinePoint, TimelineGranularity } from "@/types";
import { TIMELINE_GRANULARITIES as GRANULARITIES, formatTimelineLabel as formatLabel } from "@/lib/timeline-format";

interface TimelineChartProps {
  data: TimelinePoint[];
  /** When provided, renders a granularity toggle (Minute/Hour/Day/Week/Month) in the header. */
  groupBy?: TimelineGranularity;
  onGroupByChange?: (g: TimelineGranularity) => void;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-none border border-border bg-popover/90 p-2 shadow-xl backdrop-blur-md ring-1 ring-white/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          {payload[0].value} {payload[0].value === 1 ? "response" : "responses"}
        </p>
      </div>
    );
  }
  return null;
};

export function TimelineChart({ data, groupBy = "day", onGroupByChange }: TimelineChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatLabel(d.date, groupBy),
  }));

  const total = data.reduce((sum, d) => sum + d.count, 0);
  // Thin out x-axis labels so they don't collide once the range spans many buckets.
  const tickInterval = Math.max(0, Math.ceil(formatted.length / 8) - 1);

  return (
    <div className="border border-border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Response Timeline</h3>
        <div className="flex items-center gap-3">
          {onGroupByChange && (
            <div className="flex items-center border border-border">
              {GRANULARITIES.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => onGroupByChange(g.value)}
                  className={`px-2.5 py-1 text-xs transition-colors ${
                    groupBy === g.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{total}</span> total
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#timelineFill)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
