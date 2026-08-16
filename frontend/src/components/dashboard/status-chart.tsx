import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { DashboardOverview } from "@/types";

interface Props {
  data: DashboardOverview["statusBreakdown"];
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

export function StatusChart({ data }: Props) {
  const rows = data.map((d) => ({ ...d, status: d.status.charAt(0).toUpperCase() + d.status.slice(1) }));

  return (
    <div className="border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold">Status breakdown</h3>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nothing created yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="status" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
            <Bar dataKey="polls" stackId="s" fill="var(--chart-1)" />
            <Bar dataKey="forms" stackId="s" fill="var(--chart-3)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
