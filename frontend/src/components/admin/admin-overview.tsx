import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MessageSquare, BarChart3, FileText, BadgeCheck, KeyRound, Activity, UserPlus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { StatTile } from "@/components/dashboard/stat-tile";
import { useAdminOverview } from "@/hooks/use-admin";
import { TIMELINE_GRANULARITIES, formatTimelineLabel } from "@/lib/timeline-format";
import { ChartTooltip, Panel, Pill } from "./admin-ui";
import { formatNumber, statusTone } from "@/lib/admin-format";
import type { TimelineGranularity } from "@/types";

const SERIES = [
  { key: "signups", color: "var(--chart-2)" },
  { key: "polls", color: "var(--chart-1)" },
  { key: "forms", color: "var(--chart-3)" },
] as const;

export function AdminOverviewTab() {
  const navigate = useNavigate();
  const [groupBy, setGroupBy] = useState<TimelineGranularity>("day");
  const { data, isLoading } = useAdminOverview(groupBy);

  if (isLoading || !data) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="shimmer h-24" />)}</div>;

  const t = data.totals;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const stats = [
    { label: "Users", value: formatNumber(t.users), icon: Users, color: "text-primary" },
    { label: "Responses", value: formatNumber(t.responses), icon: MessageSquare, color: "text-emerald-500" },
    { label: `Polls · ${t.activePolls} live`, value: formatNumber(t.polls), icon: BarChart3, color: "text-amber-500" },
    { label: `Forms · ${t.activeForms} live`, value: formatNumber(t.forms), icon: FileText, color: "text-sky-500" },
    { label: "New users · 7d", value: `+${t.newUsers7}`, icon: UserPlus, color: "text-primary" },
    { label: "Responses · 7d", value: `+${formatNumber(t.responses7)}`, icon: Activity, color: "text-emerald-500" },
    { label: "Verified", value: pct(t.verified, t.users), icon: BadgeCheck, color: "text-muted-foreground" },
    { label: "Active sessions", value: formatNumber(t.activeSessions), icon: KeyRound, color: "text-muted-foreground" },
  ];
  const timeline = data.timeline.map((d) => ({ ...d, label: formatTimelineLabel(d.date, groupBy) }));
  const maxAudience = Math.max(1, ...data.audience.map((a) => a.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {stats.map((s) => <StatTile key={s.label} stat={s} />)}
      </div>

      <Panel
        title="Platform activity"
        action={
          <div className="flex items-center border border-border">
            {TIMELINE_GRANULARITIES.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGroupBy(g.value)}
                className={`px-2.5 py-1 text-xs ${groupBy === g.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        }
      >
        {timeline.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No activity in this window.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeline} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
              {SERIES.map((s) => (
                <Area key={s.key} type="monotone" dataKey={s.key} name={s.key === "signups" ? "signups" : `${s.key.slice(0, -1)} responses`} stroke={s.color} fill={s.color} fillOpacity={0.08} strokeWidth={2} dot={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top creators">
          {data.topCreators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No creators yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.topCreators.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => navigate(`/admin/users/${c.id}`)} className="flex w-full items-center gap-3 py-2 text-left hover:text-primary">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.email} · {c.polls} polls · {c.forms} forms</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatNumber(c.responses)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Most answered">
          {data.topContent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing published yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.topContent.map((c) => (
                <li key={`${c.kind}-${c.id}`} className="flex items-center gap-3 py-2">
                  <Pill tone={c.kind === "poll" ? "primary" : "muted"}>{c.kind}</Pill>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">by {c.creator}</span>
                  </span>
                  <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                  <span className="w-12 text-right text-sm font-semibold tabular-nums">{formatNumber(c.responses)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Who signs up (onboarding)">
        <div className="space-y-2">
          {data.audience.map((a) => (
            <div key={a.usage} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="truncate capitalize text-muted-foreground">{a.usage.replace("_", " ")}</span>
              <div className="h-2 bg-muted"><div className="h-full bg-primary" style={{ width: `${(a.count / maxAudience) * 100}%` }} /></div>
              <span className="text-right tabular-nums">{a.count}</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            {t.googleUsers} via Google · {t.users - t.googleUsers} via email/password · {t.newUsers30} joined in the last 30 days
          </p>
        </div>
      </Panel>
    </div>
  );
}
