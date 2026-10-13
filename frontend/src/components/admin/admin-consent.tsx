import { useState } from "react";
import { ShieldCheck, ChartLine, Megaphone, Ban } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatTile } from "@/components/dashboard/stat-tile";
import { useAdminConsent } from "@/hooks/use-admin";
import { DAY_OPTIONS, formatNumber } from "@/lib/admin-format";
import { formatDatetime, timeAgo } from "@/lib/utils";
import type { ConsentActionKind, ReportDays } from "@/types";
import { ChartTooltip, Panel, Pill, Toggle } from "./admin-ui";

const ACTIONS: Record<ConsentActionKind, { label: string; color: string; tone: "good" | "bad" | "primary" }> = {
  accept_all: { label: "Accepted all", color: "#10b981", tone: "good" },
  custom: { label: "Custom", color: "var(--chart-1)", tone: "primary" },
  reject_all: { label: "Rejected all", color: "var(--destructive)", tone: "bad" },
};

const rate = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

export function AdminConsentTab() {
  const [days, setDays] = useState<ReportDays>(30);
  const { data, isLoading } = useAdminConsent(days);

  if (isLoading || !data) return <div className="shimmer h-96" />;
  const c = data.current;
  const series = data.timeline.map((p) => ({ ...p, label: new Date(`${p.date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs text-muted-foreground">
          Every cookie decision is logged as proof of consent: what was chosen, when, under which policy version, from which page.
          Rates use each browser's latest choice.
        </p>
        <Toggle label="Report window" value={days} options={DAY_OPTIONS} onChange={setDays} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatTile stat={{ label: "Browsers that chose", value: formatNumber(c.browsers), icon: ShieldCheck, color: "text-primary" }} />
        <StatTile stat={{ label: "Allow analytics", value: rate(c.analytics, c.browsers), icon: ChartLine, color: "text-emerald-500" }} />
        <StatTile stat={{ label: "Allow campaign", value: rate(c.marketing, c.browsers), icon: Megaphone, color: "text-sky-500" }} />
        <StatTile stat={{ label: "Rejected all", value: rate(c.rejectAll, c.browsers), icon: Ban, color: "text-destructive" }} />
      </div>

      <Panel
        title="Decisions per day"
        action={
          <span className="text-xs text-muted-foreground">
            {(Object.keys(ACTIONS) as ConsentActionKind[]).map((k) => `${formatNumber(data.inWindow[k])} ${ACTIONS[k].label.toLowerCase()}`).join(" · ")}
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            {(Object.keys(ACTIONS) as ConsentActionKind[]).map((k) => (
              <Bar key={k} dataKey={k} name={ACTIONS[k].label.toLowerCase()} stackId="a" fill={ACTIONS[k].color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Consent log" action={<span className="text-xs text-muted-foreground">Latest 50 decisions</span>}>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cookie decisions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 font-semibold">When</th>
                  <th className="pb-2 font-semibold">Decision</th>
                  <th className="pb-2 font-semibold">Analytics</th>
                  <th className="pb-2 font-semibold">Campaign</th>
                  <th className="pb-2 font-semibold">Who</th>
                  <th className="pb-2 font-semibold">Where</th>
                  <th className="pb-2 font-semibold">Device</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-xs" title={formatDatetime(r.createdAt)}>
                      {timeAgo(r.createdAt)}
                    </td>
                    <td className="py-2 pr-3">
                      <Pill tone={ACTIONS[r.action].tone}>{ACTIONS[r.action].label}</Pill>
                      {r.gpc && <span className="ml-1"><Pill>GPC</Pill></span>}
                    </td>
                    <td className="py-2 pr-3 text-xs">{r.analytics ? "Allowed" : <span className="text-muted-foreground">Denied</span>}</td>
                    <td className="py-2 pr-3 text-xs">{r.marketing ? "Allowed" : <span className="text-muted-foreground">Denied</span>}</td>
                    <td className="py-2 pr-3 text-xs">
                      {r.user ? (
                        <>
                          <span className="block font-medium">{r.user.name}</span>
                          <span className="text-muted-foreground">{r.user.email}</span>
                        </>
                      ) : (
                        <span className="font-mono text-muted-foreground" title={r.consentId}>
                          Anonymous · {r.consentId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      <span className="font-mono">{r.page ?? "—"}</span>
                      <span className="block text-muted-foreground">
                        {r.source === "settings" ? "Cookie settings" : "Banner"} · policy v{r.version}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{[r.device, r.browser, r.os].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
