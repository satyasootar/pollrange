import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  polls: number;
  forms: number;
}

const COLORS = ["var(--chart-1)", "var(--chart-3)"];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}

const ChartTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]!;
  return (
    <div className="border border-border bg-popover/90 p-2 shadow-xl ring-1 ring-white/10 backdrop-blur-md">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="inline-block h-2 w-2" style={{ background: p.payload.fill }} />
        {p.value} {p.name}
      </p>
    </div>
  );
};

export function SplitDonut({ polls, forms }: Props) {
  const total = polls + forms;
  const data = [
    { name: "Polls", value: polls },
    { name: "Forms", value: forms },
  ];

  return (
    <div className="border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold">Responses by type</h3>
      {total === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No responses yet.</p>
      ) : (
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="50%" height={180}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-3">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-2.5 w-2.5" style={{ background: COLORS[i] }} />
                  {d.name}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {d.value}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({total ? Math.round((d.value / total) * 100) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
