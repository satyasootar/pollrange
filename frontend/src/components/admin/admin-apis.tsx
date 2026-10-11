import { Fragment, useMemo, useState } from "react";
import { Search, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminTraffic } from "@/hooks/use-admin";
import { formatDatetime, timeAgo } from "@/lib/utils";
import { endpointHealth, formatNumber } from "@/lib/admin-format";
import { Panel, Pill } from "./admin-ui";
import type { AdminEndpoint } from "@/types";

const SORTS = [
  { key: "count", label: "Hits" },
  { key: "p95", label: "p95" },
  { key: "errorRate", label: "Error %" },
  { key: "avgMs", label: "Avg" },
  { key: "lastAt", label: "Recent" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const HEALTH_DOT = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-destructive" } as const;
const METHOD_TONE: Record<string, "primary" | "good" | "warn" | "bad" | "muted"> = { GET: "primary", POST: "good", PATCH: "warn", PUT: "warn", DELETE: "bad" };

export function AdminApisTab() {
  const { data, isLoading } = useAdminTraffic();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("count");
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.endpoints ?? [])
      .filter((e) => !q || e.route.toLowerCase().includes(q))
      .filter((e) => !onlyProblems || endpointHealth(e) !== "good")
      .sort((a, b) => (sort === "lastAt" ? b.lastAt.localeCompare(a.lastAt) : (b[sort] as number) - (a[sort] as number)));
  }, [data, query, sort, onlyProblems]);

  if (isLoading || !data) return <div className="shimmer h-96" />;

  const all = data.endpoints;
  const failing = all.filter((e) => endpointHealth(e) === "bad").length;
  const slow = [...all].sort((a, b) => b.p95 - a.p95)[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Endpoints called" value={all.length} />
        <Summary label="Unhealthy" value={failing} tone={failing ? "bad" : "good"} hint="≥5% 5xx or p95 ≥ 2s" />
        <Summary label="Slowest p95" value={slow ? `${slow.p95} ms` : "—"} hint={slow?.route} />
      </div>

      <Panel
        title="Every endpoint"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} className="accent-primary" />
              Only problems
            </label>
            <div className="flex items-center border border-border" role="group" aria-label="Sort endpoints">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={sort === s.key}
                  onClick={() => setSort(s.key)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs ${sort === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s.label}
                  {sort === s.key && <ArrowDown className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="relative mb-3 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by path or method" aria-label="Filter endpoints" className="pl-9" />
        </div>

        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {all.length === 0 ? "No API calls recorded since the server started." : "No endpoints match."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 font-semibold">Endpoint</th>
                  <th className="pb-2 text-right font-semibold">Hits</th>
                  <th className="pb-2 text-right font-semibold">4xx</th>
                  <th className="pb-2 text-right font-semibold">5xx</th>
                  <th className="pb-2 text-right font-semibold">Error %</th>
                  <th className="pb-2 text-right font-semibold">p50</th>
                  <th className="pb-2 text-right font-semibold">p95</th>
                  <th className="pb-2 text-right font-semibold">p99</th>
                  <th className="pb-2 text-right font-semibold">Max</th>
                  <th className="pb-2 pl-3 font-semibold">Last call</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <EndpointRow key={e.route} e={e} open={open === e.route} onToggle={() => setOpen(open === e.route ? null : e.route)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Percentiles use each endpoint's last 200 calls. Counts are since the server started {timeAgo(data.since)}. Refreshes every 10s.
        </p>
      </Panel>
    </div>
  );
}

function EndpointRow({ e, open, onToggle }: { e: AdminEndpoint; open: boolean; onToggle: () => void }) {
  const [method, ...rest] = e.route.split(" ");
  const health = endpointHealth(e);
  const ms = (n: number, warn: number, bad: number) => (
    <span className={n >= bad ? "text-destructive" : n >= warn ? "text-amber-600" : ""}>{n}</span>
  );
  return (
    <Fragment>
      <tr className="cursor-pointer border-t border-border hover:bg-muted/50" onClick={onToggle} aria-expanded={open}>
        <td className="max-w-[22rem] py-2 pr-3">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${HEALTH_DOT[health]}`} aria-label={`health ${health}`} />
            <Pill tone={METHOD_TONE[method!] ?? "muted"}>{method}</Pill>
            <span className="truncate font-mono text-xs" title={rest.join(" ")}>{rest.join(" ")}</span>
          </span>
        </td>
        <td className="py-2 text-right tabular-nums">{formatNumber(e.count)}</td>
        <td className="py-2 text-right tabular-nums text-muted-foreground">{e.clientErrors || "—"}</td>
        <td className={`py-2 text-right tabular-nums ${e.errors ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{e.errors || "—"}</td>
        <td className="py-2 text-right tabular-nums">{ms(e.errorRate, 0.01, 5)}</td>
        <td className="py-2 text-right tabular-nums">{e.p50}</td>
        <td className="py-2 text-right tabular-nums">{ms(e.p95, 500, 2000)}</td>
        <td className="py-2 text-right tabular-nums">{ms(e.p99, 1000, 5000)}</td>
        <td className="py-2 text-right tabular-nums text-muted-foreground">{e.maxMs}</td>
        <td className="whitespace-nowrap py-2 pl-3 text-xs text-muted-foreground" title={formatDatetime(e.lastAt)}>{timeAgo(e.lastAt)}</td>
      </tr>
      {open && (
        <tr className="bg-muted/30">
          <td colSpan={10} className="px-3 py-2 text-xs">
            {e.lastError ? (
              <p className="flex flex-wrap items-center gap-2">
                <Pill tone={e.lastError.status >= 500 ? "bad" : "warn"}>{e.lastError.status}</Pill>
                <span className="break-all">{e.lastError.message || "(no message)"}</span>
                <span className="ml-auto text-muted-foreground">{timeAgo(e.lastError.at)}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">No errors recorded for this endpoint. Avg {e.avgMs} ms.</p>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function Summary({ label, value, hint, tone }: { label: string; value: string | number; hint?: string | undefined; tone?: "good" | "bad" }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone === "bad" ? "text-destructive" : tone === "good" ? "text-emerald-600" : ""}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground" title={hint}>{hint}</p>}
    </div>
  );
}
