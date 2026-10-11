import { useState } from "react";
import { Gauge, Zap, AlertTriangle, Timer } from "lucide-react";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { StatTile } from "@/components/dashboard/stat-tile";
import { useAdminTraffic } from "@/hooks/use-admin";
import { formatDatetime, timeAgo } from "@/lib/utils";
import { ChartTooltip, Panel, Pill } from "./admin-ui";
import { formatNumber } from "@/lib/admin-format";

const CLASS_TONE = { "2xx": "bg-emerald-500", "3xx": "bg-sky-500", "4xx": "bg-amber-500", "5xx": "bg-destructive" } as const;

export function AdminTrafficTab() {
  const { data, isLoading } = useAdminTraffic();
  const [range, setRange] = useState<"hour" | "day">("hour");

  if (isLoading || !data) return <div className="shimmer h-96" />;

  const classTotal = Object.values(data.statusClasses).reduce((a, b) => a + b, 0);
  const errorRate = classTotal ? (data.statusClasses["5xx"] / classTotal) * 100 : 0;
  const series = (range === "hour" ? data.lastHour : data.last24h).map((p) => ({
    ...p,
    label: new Date(p.t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Live API traffic since the server started {timeAgo(data.since)} ({formatDatetime(data.since)}). Refreshes every 10s.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatTile stat={{ label: "Requests / min", value: data.requestsPerMinute, icon: Gauge, color: "text-primary" }} />
        <StatTile stat={{ label: "Total requests", value: formatNumber(data.totalRequests), icon: Zap, color: "text-sky-500" }} />
        <StatTile stat={{ label: "p95 latency", value: `${data.latencyMs.p95} ms`, icon: Timer, color: "text-amber-500" }} />
        <StatTile
          stat={{ label: "Server error rate", value: `${errorRate.toFixed(errorRate < 1 ? 2 : 1)}%`, icon: AlertTriangle, color: errorRate > 1 ? "text-destructive" : "text-emerald-500" }}
        />
      </div>

      <Panel
        title="Requests"
        action={
          <div className="flex items-center border border-border">
            {(["hour", "day"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-xs ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {r === "hour" ? "Last hour" : "Last 24h"}
              </button>
            ))}
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="requests" name="requests" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.1} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="clientErrors" name="4xx" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="errors" name="5xx" stroke="var(--destructive)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Status codes">
          <div className="flex h-3 w-full overflow-hidden bg-muted" aria-hidden="true">
            {(Object.keys(CLASS_TONE) as (keyof typeof CLASS_TONE)[]).map((k) =>
              data.statusClasses[k] ? <div key={k} className={CLASS_TONE[k]} style={{ width: `${(data.statusClasses[k] / classTotal) * 100}%` }} /> : null
            )}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {(Object.keys(CLASS_TONE) as (keyof typeof CLASS_TONE)[]).map((k) => (
              <li key={k} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className={`h-2 w-2 ${CLASS_TONE[k]}`} />{k}</span>
                <span className="tabular-nums">{formatNumber(data.statusClasses[k])}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Latency p50 {data.latencyMs.p50} ms · p95 {data.latencyMs.p95} ms · p99 {data.latencyMs.p99} ms
          </p>
        </Panel>

        <Panel title="Busiest endpoints" className="lg:col-span-2">
          {data.endpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr><th className="pb-2 font-semibold">Route</th><th className="pb-2 text-right font-semibold">Hits</th><th className="pb-2 text-right font-semibold">p95</th><th className="pb-2 text-right font-semibold">Max</th><th className="pb-2 text-right font-semibold">5xx</th></tr>
                </thead>
                <tbody>
                  {data.endpoints.slice(0, 8).map((r) => (
                    <tr key={r.route} className="border-t border-border">
                      <td className="max-w-[18rem] truncate py-1.5 font-mono text-xs" title={r.route}>{r.route}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatNumber(r.count)}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.p95} ms</td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r.maxMs} ms</td>
                      <td className={`py-1.5 text-right tabular-nums ${r.errors ? "text-destructive" : "text-muted-foreground"}`}>{r.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Latency and errors for every endpoint are on the APIs tab.</p>
        </Panel>
      </div>

      <Panel title="Recent server errors" action={<Pill tone={data.recentErrors.length ? "bad" : "good"}>{data.recentErrors.length || "none"}</Pill>}>
        {data.recentErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No 5xx errors since the server started.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.recentErrors.map((e, i) => (
              <li key={i} className="py-2 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <Pill tone="bad">{e.status}</Pill>
                  <span className="font-mono text-xs">{e.method} {e.path}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{timeAgo(e.at)}</span>
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
