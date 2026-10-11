import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useAdminStorage, useAdminSystem } from "@/hooks/use-admin";
import { timeAgo } from "@/lib/utils";
import { KV, Meter, Panel, Pill, StatusDot } from "./admin-ui";
import { formatBytes, formatNumber, formatUptime } from "@/lib/admin-format";
import type { AdminStorage } from "@/types";

export function AdminSystemTab() {
  const { data: sys, isLoading, dataUpdatedAt } = useAdminSystem();
  const { data: storage, isLoading: storageLoading } = useAdminStorage();

  if (isLoading || !sys) return <div className="shimmer h-96" />;
  const healthy = sys.status === "healthy";
  const usedMem = sys.host.totalMem - sys.host.freeMem;

  return (
    <div className="space-y-6">
      <div className={`flex flex-wrap items-center gap-4 border p-4 ${healthy ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
        {healthy ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
        <div className="mr-auto">
          <p className="font-semibold">{healthy ? "All systems operational" : "Degraded: check the failing items"}</p>
          <p className="text-xs text-muted-foreground">Up {formatUptime(sys.process.uptimeSec)} · checked {timeAgo(new Date(dataUpdatedAt))} · refreshes every 10s</p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {sys.checks.map((c) => (
            <li key={c.name} title={c.detail}><StatusDot ok={c.ok} label={`${c.name}: ${c.detail}`} /></li>
          ))}
        </ul>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="API process">
          <div className="space-y-3">
            <Meter label={`Heap ${formatBytes(sys.process.memory.heapUsed)} / ${formatBytes(sys.process.memory.heapTotal)}`} value={sys.process.memory.heapUsed} max={sys.process.memory.heapTotal} />
            <div className="divide-y divide-border">
              <KV label="Memory (RSS)">{formatBytes(sys.process.memory.rss)}</KV>
              <KV label="CPU (avg)">{sys.process.cpuPercent}%</KV>
              <KV label="Event loop delay">{sys.process.eventLoopDelayMs.mean} ms · p99 {sys.process.eventLoopDelayMs.p99} ms</KV>
              <KV label="Node">{sys.process.node}</KV>
              <KV label="Environment"><Pill tone={sys.process.environment === "production" ? "good" : "warn"}>{sys.process.environment}</Pill></KV>
            </div>
          </div>
        </Panel>

        <Panel title="Host">
          <div className="space-y-3">
            <Meter label={`Memory ${formatBytes(usedMem)} / ${formatBytes(sys.host.totalMem)}`} value={usedMem} max={sys.host.totalMem} />
            <div className="divide-y divide-border">
              <KV label="CPU cores">{sys.host.cores}</KV>
              <KV label="Load avg (1/5/15m)">{sys.host.loadAvg.some((n) => n > 0) ? sys.host.loadAvg.map((n) => n.toFixed(2)).join(" / ") : "n/a"}</KV>
              <KV label="Platform">{sys.process.platform}</KV>
              <KV label="PID">{sys.process.pid}</KV>
            </div>
          </div>
        </Panel>

        <Panel title="Database & realtime">
          <div className="divide-y divide-border">
            <KV label="MongoDB"><StatusDot ok={sys.database.state === "connected"} label={sys.database.state} /></KV>
            <KV label="Ping">{sys.database.pingMs != null ? `${sys.database.pingMs} ms` : "failed"}</KV>
            <KV label="Database">{sys.database.name}</KV>
            <KV label="Socket clients">{sys.sockets.connected}</KV>
            <KV label="Live rooms">{sys.sockets.rooms}</KV>
          </div>
        </Panel>

        <Panel title="Background jobs">
          <div className="divide-y divide-border">
            <KV label="Poll expiry watcher"><StatusDot ok={!sys.jobs.expiry.lastError} label={sys.jobs.expiry.lastError ? "failing" : "ok"} /></KV>
            <KV label="Last run">{sys.jobs.expiry.lastRunAt ? timeAgo(sys.jobs.expiry.lastRunAt) : "never"}</KV>
            <KV label="Polls auto-closed">{sys.jobs.expiry.totalClosed}</KV>
          </div>
          {sys.jobs.expiry.lastError && <p className="mt-2 break-words text-xs text-destructive">{sys.jobs.expiry.lastError}</p>}
        </Panel>

        <Panel title="Integrations" className="xl:col-span-2">
          <ul className="grid gap-2 sm:grid-cols-2">
            {sys.integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between border border-border px-3 py-2 text-sm">
                {i.name}
                <Pill tone={i.configured ? "good" : "muted"}>{i.configured ? "configured" : "not set"}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Storage</h2>
      {storageLoading || !storage ? <div className="shimmer h-64" /> : <StorageSection storage={storage} />}
    </div>
  );
}

function StorageSection({ storage }: { storage: AdminStorage }) {
  const db = storage.database;
  const maxColl = Math.max(1, ...storage.collections.map((c) => c.storageSize ?? 0));
  const cl = storage.cloudinary;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel title="MongoDB">
        {db.error ? (
          <p className="text-sm text-destructive">{db.error}</p>
        ) : (
          <div className="divide-y divide-border">
            <KV label="Data size">{formatBytes(db.dataSize)}</KV>
            <KV label="On disk">{formatBytes(db.storageSize)}</KV>
            <KV label="Indexes">{formatBytes(db.indexSize)}</KV>
            <KV label="Documents">{formatNumber(db.objects ?? 0)}</KV>
            <KV label="Collections">{db.collections}</KV>
          </div>
        )}
      </Panel>

      <Panel title="File uploads">
        <div className="space-y-3">
          <div className="divide-y divide-border">
            <KV label="Respondent files">{formatNumber(storage.uploads.files)}</KV>
            <KV label="Uploaded size">{formatBytes(storage.uploads.bytes)}</KV>
          </div>
          {!cl.configured ? (
            <p className="text-xs text-muted-foreground">Cloudinary isn't configured, so uploads are disabled.</p>
          ) : "error" in cl ? (
            <p className="text-xs text-destructive">Cloudinary: {cl.error}</p>
          ) : (
            <div className="space-y-3 border-t border-border pt-3">
              <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cloudinary {cl.plan && <Pill tone="primary">{cl.plan}</Pill>}
              </p>
              {cl.creditsPercent != null && <Meter label={`Credits ${cl.creditsUsed ?? 0} / ${cl.creditsLimit ?? "∞"}`} value={cl.creditsPercent} max={100} />}
              <div className="divide-y divide-border">
                <KV label="Stored">{formatBytes(cl.storageBytes)}</KV>
                <KV label="Bandwidth">{formatBytes(cl.bandwidthBytes)}</KV>
                <KV label="Assets">{formatNumber(cl.resources)}</KV>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Collections">
        <ul className="space-y-2.5">
          {storage.collections.map((c) => (
            <li key={c.name} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs">{c.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatNumber(c.count)} docs · {formatBytes(c.storageSize)}</span>
              </div>
              {c.storageSize != null && (
                <div className="mt-1 h-1 bg-muted"><div className="h-full bg-primary/70" style={{ width: `${(c.storageSize / maxColl) * 100}%` }} /></div>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
