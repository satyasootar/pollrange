import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ChartLine, Megaphone, Ban, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/api/admin.api";
import { useAdminConsent, useAdminConsentRecords } from "@/hooks/use-admin";
import { CONSENT_VERSION } from "@/lib/consent";
import { CONSENT_ACTIONS, DAY_OPTIONS, formatNumber } from "@/lib/admin-format";
import { downloadBlob, formatDatetime, timeAgo, toastApiError } from "@/lib/utils";
import type { ConsentActionKind, ConsentRecordFilters, ReportDays } from "@/types";
import { BarList, ChartTooltip, KV, Panel, Pill, Toggle } from "./admin-ui";
import { ConsentHistoryDialog } from "./admin-consent-history";

const rate = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

export function AdminConsentTab() {
  const [days, setDays] = useState<ReportDays>(30);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useAdminConsent(days);

  if (isLoading || !data) return <div className="shimmer h-96" />;
  const c = data.current;
  const series = data.timeline.map((p) => ({ ...p, label: new Date(`${p.date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }));
  const source = (s: "banner" | "settings") => data.bySource.find((r) => r.source === s)?.browsers ?? 0;

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

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Policy versions">
          <BarList
            rows={data.byVersion.map((v) => ({
              label: v.version === CONSENT_VERSION ? `v${v.version} · current` : `v${v.version} · re-asked on next visit`,
              value: v.browsers,
            }))}
            empty="No decisions yet."
            unit="browsers"
          />
        </Panel>
        <Panel title="Where they chose">
          <BarList
            rows={[
              { label: "Cookie banner", value: source("banner") },
              { label: "Cookie settings", value: source("settings") },
            ].filter((r) => r.value)}
            empty="No decisions yet."
            unit="browsers"
          />
        </Panel>
        <Panel title="Behaviour">
          <KV label="Sent Global Privacy Control">
            {formatNumber(c.gpc)} <span className="text-muted-foreground">({rate(c.gpc, c.browsers)})</span>
          </KV>
          <KV label="Changed their mind">
            {formatNumber(c.changedMind)} <span className="text-muted-foreground">({rate(c.changedMind, c.browsers)})</span>
          </KV>
          <KV label="Withdrew analytics">
            {formatNumber(c.withdrew)} <span className="text-muted-foreground">({rate(c.withdrew, c.browsers)})</span>
          </KV>
        </Panel>
      </div>

      <Panel
        title="Decisions per day"
        action={
          <span className="text-xs text-muted-foreground">
            {(Object.keys(CONSENT_ACTIONS) as ConsentActionKind[]).map((k) => `${formatNumber(data.inWindow[k])} ${CONSENT_ACTIONS[k].label.toLowerCase()}`).join(" · ")}
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
            {(Object.keys(CONSENT_ACTIONS) as ConsentActionKind[]).map((k) => (
              <Bar key={k} dataKey={k} name={CONSENT_ACTIONS[k].label.toLowerCase()} stackId="a" fill={CONSENT_ACTIONS[k].color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <ConsentLog onOpen={setOpenId} />
      <ConsentHistoryDialog consentId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

type Tri = "all" | "yes" | "no";
const TRI: { value: Tri; label: string }[] = [
  { value: "all", label: "All" },
  { value: "yes", label: "Allowed" },
  { value: "no", label: "Denied" },
];
const triToBool = (t: Tri) => (t === "all" ? undefined : t === "yes");

/** Searchable, filterable, paginated log of every decision, with CSV export. */
function ConsentLog({ onOpen }: { onOpen: (consentId: string) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<ConsentActionKind | "all">("all");
  const [analytics, setAnalytics] = useState<Tri>("all");
  const [marketing, setMarketing] = useState<Tri>("all");
  const [source, setSource] = useState<"all" | "banner" | "settings">("all");
  const [exporting, setExporting] = useState(false);
  const deferred = useDeferredValue(search.trim());

  const a = triToBool(analytics);
  const m = triToBool(marketing);
  const filters: ConsentRecordFilters = {
    ...(deferred ? { search: deferred } : {}),
    ...(action !== "all" ? { action } : {}),
    ...(a !== undefined ? { analytics: a } : {}),
    ...(m !== undefined ? { marketing: m } : {}),
    ...(source !== "all" ? { source } : {}),
  };
  const { data, isLoading, isFetching } = useAdminConsentRecords(page, filters);

  /** Every filter change starts again from page 1. */
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await adminApi.consentExport(filters);
      downloadBlob(res.data, `consent-log-${new Date().toISOString().slice(0, 10)}.csv`);
      const cap = res.headers["x-export-truncated"];
      if (cap) toast.warning(`Export capped at the newest ${Number(cap).toLocaleString()} decisions. Narrow the filters for older ones.`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Panel
      title="Consent log"
      action={
        <div className="flex items-center gap-3">
          {data && <span className="text-xs text-muted-foreground">{formatNumber(data.pagination.total)} decisions</span>}
          <Button variant="outline" size="xs" onClick={exportCsv} disabled={exporting || !data?.pagination.total}>
            <Download aria-hidden="true" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      }
    >
      <div className="mb-4 space-y-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => filter(setSearch)(e.target.value)}
            placeholder="Search consent ID, user name/email, or page"
            aria-label="Search consent log"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <FilterGroup label="Decision">
            <Toggle
              label="Filter by decision"
              value={action}
              onChange={filter(setAction)}
              options={[{ value: "all" as const, label: "All" }, ...(Object.keys(CONSENT_ACTIONS) as ConsentActionKind[]).map((k) => ({ value: k, label: CONSENT_ACTIONS[k].label }))]}
            />
          </FilterGroup>
          <FilterGroup label="Analytics">
            <Toggle label="Filter by analytics" value={analytics} onChange={filter(setAnalytics)} options={TRI} />
          </FilterGroup>
          <FilterGroup label="Campaign">
            <Toggle label="Filter by campaign" value={marketing} onChange={filter(setMarketing)} options={TRI} />
          </FilterGroup>
          <FilterGroup label="Where">
            <Toggle
              label="Filter by where they chose"
              value={source}
              onChange={filter(setSource)}
              options={[
                { value: "all" as const, label: "All" },
                { value: "banner" as const, label: "Banner" },
                { value: "settings" as const, label: "Settings" },
              ]}
            />
          </FilterGroup>
        </div>
      </div>

      <div className={`overflow-x-auto transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <table className="w-full min-w-200 text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="pb-2 font-semibold">When</th>
              <th className="pb-2 font-semibold">Decision</th>
              <th className="pb-2 font-semibold">Analytics</th>
              <th className="pb-2 font-semibold">Campaign</th>
              <th className="pb-2 font-semibold">Who</th>
              <th className="pb-2 font-semibold">Where</th>
              <th className="pb-2 font-semibold">Device</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-t border-border">
                  <td colSpan={8} className="py-2">
                    <div className="shimmer h-8" />
                  </td>
                </tr>
              ))}
            {data?.items.map((r) => (
              <tr key={r.id} onClick={() => onOpen(r.consentId)} className="cursor-pointer border-t border-border align-top hover:bg-muted/40">
                <td className="whitespace-nowrap py-2 pr-3 text-xs" title={formatDatetime(r.createdAt)}>
                  {timeAgo(r.createdAt)}
                </td>
                <td className="py-2 pr-3">
                  <Pill tone={CONSENT_ACTIONS[r.action].tone}>{CONSENT_ACTIONS[r.action].label}</Pill>
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
                <td className="py-2 pr-3 text-xs text-muted-foreground">{[r.device, r.browser, r.os].filter(Boolean).join(" · ") || "—"}</td>
                <td className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`View consent history for ${r.user?.email ?? r.consentId}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(r.consentId);
                    }}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  {Object.keys(filters).length ? "No decisions match these filters." : "No cookie decisions recorded yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Panel>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
