import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DashboardOverview, TimelineGranularity } from "@/types";
import { TIMELINE_GRANULARITIES, formatTimelineLabel } from "@/lib/timeline-format";

interface Props {
  data: DashboardOverview["timeline"];
  groupBy: TimelineGranularity;
  onGroupByChange: (g: TimelineGranularity) => void;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-popover/90 p-2 shadow-xl ring-1 ring-white/10 backdrop-blur-md">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-block h-2 w-2" style={{ background: p.color }} />
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
};

export function ResponsesAreaChart({ data, groupBy, onGroupByChange }: Props) {
  const formatted = data.map((d) => ({ ...d, label: formatTimelineLabel(d.date, groupBy) }));
  const total = data.reduce((s, d) => s + d.polls + d.forms, 0);
  const tickInterval = Math.max(0, Math.ceil(formatted.length / 8) - 1);

  return (
    <div className="border border-border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Responses over time</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border">
            {TIMELINE_GRANULARITIES.map((g) => (
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
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{total}</span> total
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={formatted} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pollFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="formFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
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
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }}
          />
          <Area
            type="monotone"
            dataKey="polls"
            stackId="1"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#pollFill)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="forms"
            stackId="1"
            stroke="var(--chart-3)"
            strokeWidth={2}
            fill="url(#formFill)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--chart-3)", stroke: "var(--card)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
