import { useState } from "react";
import { Users, Eye, MousePointerClick, Timer, Radio, LogOut } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatTile } from "@/components/dashboard/stat-tile";
import { useAdminSiteAnalytics } from "@/hooks/use-admin";
import { DAY_OPTIONS, formatNumber } from "@/lib/admin-format";
import type { KeyCount, ReportDays } from "@/types";
import { BarList, ChartTooltip, Panel, Toggle } from "./admin-ui";

const EVENT_LABELS: Record<string, string> = {
  signup: "Sign-ups",
  login: "Sign-ins",
  poll_created: "Polls created",
  form_created: "Forms created",
  upgrade_requested: "Upgrade requests",
};

const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;
const duration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
const rows = (list: KeyCount[], label?: (k: string) => string) =>
  list.map((r) => ({ label: label ? label(r.key) : r.key, value: r.sessions ?? r.users ?? 0 }));
const sourceLabel = (k: string) => (k === "direct" ? "Direct / none" : k === "unknown" ? "Unknown (no campaign consent)" : k);

export function AdminSiteAnalyticsTab() {
  const [days, setDays] = useState<ReportDays>(30);
  const { data, isLoading } = useAdminSiteAnalytics(days);

  if (isLoading || !data) return <div className="shimmer h-96" />;
  const t = data.totals;
  const top = data.funnel[0]?.visitors || 1;
  const series = data.timeline.map((p) => ({ ...p, label: new Date(`${p.date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs text-muted-foreground">
          First-party analytics from visitors who allowed analytics cookies. Respondent poll and form pages are never tracked.
          <span className="ml-2 inline-flex items-center gap-1 text-foreground">
            <Radio className="h-3 w-3 text-emerald-500" aria-hidden="true" /> {data.activeNow} active in the last 5 minutes
          </span>
        </p>
        <Toggle label="Report window" value={days} options={DAY_OPTIONS} onChange={setDays} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
        <StatTile stat={{ label: "Visitors", value: formatNumber(t.visitors), icon: Users, color: "text-primary" }} />
        <StatTile stat={{ label: "Visits", value: formatNumber(t.sessions), icon: MousePointerClick, color: "text-sky-500" }} />
        <StatTile stat={{ label: "Page views", value: formatNumber(t.pageviews), icon: Eye, color: "text-violet-500" }} />
        <StatTile stat={{ label: "Bounce rate", value: pct(t.bounceRate), icon: LogOut, color: "text-amber-500" }} />
        <StatTile stat={{ label: "Avg. visit", value: `${duration(t.avgSessionSeconds)} · ${t.pagesPerSession.toFixed(1)} pages`, icon: Timer, color: "text-emerald-500" }} />
      </div>

      <Panel title="Visitors and page views">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="pageviews" name="page views" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.08} strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="visitors" name="visitors" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sign-up journey">
          <ol className="space-y-3">
            {data.funnel.map((f, i) => {
              const prev = i ? data.funnel[i - 1]!.visitors : 0;
              return (
                <li key={f.step}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{f.step}</span>
                    <span className="tabular-nums">
                      {formatNumber(f.visitors)}
                      {i > 0 && <span className="ml-2 text-xs text-muted-foreground">{prev ? pct(f.visitors / prev) : "—"} of previous</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${(f.visitors / top) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Counted per visitor who allowed analytics.</p>
        </Panel>

        <Panel title="New accounts by source">
          <BarList rows={rows(data.signupSources, sourceLabel)} unit="users" empty="No sign-ups in this window." />
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Every account created in the window, by the source saved on it (needs campaign-attribution consent).
          </p>
        </Panel>

        <Panel title="Traffic sources">
          <BarList rows={rows(data.sources, sourceLabel)} unit="visits" />
        </Panel>

        <Panel title="Campaigns">
          <BarList rows={rows(data.campaigns)} unit="visits" empty="No campaign-tagged visits (utm_campaign) yet." />
        </Panel>

        <Panel title="Top pages">
          <BarList rows={data.topPages.map((p) => ({ label: p.path, value: p.views, hint: `${formatNumber(p.visitors)} visitors` }))} />
        </Panel>

        <Panel title="Landing pages">
          <BarList rows={rows(data.landingPages)} unit="visits" />
        </Panel>

        <Panel title="Product events">
          <BarList
            rows={data.events.map((e) => ({ label: EVENT_LABELS[e.name] ?? e.name, value: e.count, hint: `${formatNumber(e.visitors)} visitors` }))}
            empty="No events yet."
          />
        </Panel>

        <Panel title="Devices">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</p>
              <BarList rows={rows(data.devices)} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Browser</p>
              <BarList rows={rows(data.browsers)} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">OS</p>
              <BarList rows={rows(data.os)} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
