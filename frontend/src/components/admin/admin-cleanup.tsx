import { useState } from "react";
import { AlertTriangle, Trash2, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminAudit, useFormCleanup, useFormCleanupPreview } from "@/hooks/use-admin";
import { formatDate, formatDatetime, timeAgo, toastApiError } from "@/lib/utils";
import { toast } from "sonner";
import { formatBytes, formatNumber, statusTone, toCleanupFilter } from "@/lib/admin-format";
import { Panel, Pill } from "./admin-ui";
import type { FormCleanupFilter, FormCleanupPreview, FormCleanupResult, FormStatus } from "@/types";

const STATUSES: FormStatus[] = ["draft", "active", "published", "closed"];

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return isoDay(d);
};

const PRESETS = [
  { label: "Older than 3 months", from: "2000-01-01", to: () => monthsAgo(3) },
  { label: "Older than 6 months", from: "2000-01-01", to: () => monthsAgo(6) },
  { label: "Older than 1 year", from: "2000-01-01", to: () => monthsAgo(12) },
  { label: "Everything", from: "2000-01-01", to: () => isoDay(new Date()) },
];

export function AdminCleanupTab() {
  const [from, setFrom] = useState("2000-01-01");
  const [to, setTo] = useState(monthsAgo(6));
  const [statuses, setStatuses] = useState<FormStatus[]>([]);
  const [onlyTrashed, setOnlyTrashed] = useState(false);
  const [previewed, setPreviewed] = useState<{ key: string; filter: FormCleanupFilter; data: FormCleanupPreview } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<FormCleanupResult | null>(null);

  const preview = useFormCleanupPreview();
  const cleanup = useFormCleanup();

  const validRange = !!from && !!to && from <= to;
  const filter = validRange ? toCleanupFilter(from, to, statuses, onlyTrashed) : null;
  const key = JSON.stringify(filter);
  const stale = !!previewed && previewed.key !== key;

  const runPreview = () => {
    if (!filter) return;
    setResult(null);
    preview.mutate(filter, {
      onSuccess: (data) => setPreviewed({ key, filter, data }),
      onError: (err) => toastApiError(err),
    });
  };

  const runDelete = () => {
    if (!previewed) return;
    cleanup.mutate(
      { ...previewed.filter, expectedForms: previewed.data.forms },
      {
        onSuccess: (r) => {
          setResult(r);
          setPreviewed(null);
          setConfirmOpen(false);
          toast.success(`Deleted ${r.formsDeleted} forms and ${r.responsesDeleted} responses.`);
        },
        onError: (err) => {
          setConfirmOpen(false);
          toastApiError(err);
        },
      }
    );
  };

  const p = previewed?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <p>
          <span className="font-semibold">Permanent deletion.</span> This removes the selected forms, every response to them, and their
          Cloudinary images and uploaded files. It can't be undone. Images that other forms or profiles still use are kept.
        </p>
      </div>

      <Panel title="1. Choose forms by creation date">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((pr) => (
              <button
                key={pr.label}
                type="button"
                onClick={() => {
                  setFrom(pr.from);
                  setTo(pr.to());
                }}
                className="border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                {pr.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="cleanup-from" className="text-xs">Created from</Label>
              <Input id="cleanup-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cleanup-to" className="text-xs">Created to (inclusive)</Label>
              <Input id="cleanup-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-44" />
            </div>
          </div>
          {!validRange && <p className="text-xs text-destructive">Pick a start date on or before the end date.</p>}

          <div className="space-y-1.5">
            <p className="text-xs font-medium">Status <span className="font-normal text-muted-foreground">(none selected = any status)</span></p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const on = statuses.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStatuses(on ? statuses.filter((x) => x !== s) : [...statuses, s])}
                    className={`border px-2.5 py-1 text-xs capitalize ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyTrashed} onChange={(e) => setOnlyTrashed(e.target.checked)} className="accent-primary" />
            Only forms creators already deleted (in trash)
          </label>

          <Button onClick={runPreview} disabled={!validRange || preview.isPending} variant="outline" className="gap-2">
            <Search className="h-4 w-4" /> {preview.isPending ? "Checking…" : "Preview what will be deleted"}
          </Button>
        </div>
      </Panel>

      {p && (
        <Panel title="2. Review" action={stale ? <Pill tone="warn">filters changed, preview again</Pill> : <Pill tone="primary">preview</Pill>}>
          {p.forms === 0 ? (
            <p className="text-sm text-muted-foreground">No forms match these filters. Nothing to delete.</p>
          ) : (
            <div className={`space-y-4 ${stale ? "opacity-50" : ""}`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Big label="Forms" value={formatNumber(p.forms)} />
                <Big label="Responses" value={formatNumber(p.responses)} />
                <Big label="Uploaded files" value={formatNumber(p.files.count)} hint={formatBytes(p.files.bytes)} />
                <Big label="Cloudinary assets" value={formatNumber(p.assets.toDelete)} hint={p.assets.keptShared ? `${p.assets.keptShared} shared, kept` : undefined} />
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(p.byStatus).map(([s, n]) => <Pill key={s} tone={statusTone(s)}>{s}: {n}</Pill>)}
                {p.trashed > 0 && <Pill tone="muted">in trash: {p.trashed}</Pill>}
              </div>

              {p.live > 0 && (
                <p className="flex items-center gap-2 border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {p.live} of these forms are still live and may be collecting responses right now.
                </p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr><th className="pb-2 font-semibold">Form (oldest first)</th><th className="pb-2 font-semibold">Owner</th><th className="pb-2 font-semibold">Status</th><th className="pb-2 text-right font-semibold">Responses</th><th className="pb-2 font-semibold">Created</th></tr>
                  </thead>
                  <tbody>
                    {p.sample.map((f) => (
                      <tr key={f.id} className="border-t border-border">
                        <td className="max-w-[16rem] truncate py-1.5" title={f.title}>{f.title}</td>
                        <td className="max-w-[12rem] truncate py-1.5 text-xs text-muted-foreground">{f.creator}</td>
                        <td className="py-1.5"><Pill tone={f.isDeleted ? "muted" : statusTone(f.status)}>{f.isDeleted ? "trashed" : f.status}</Pill></td>
                        <td className="py-1.5 text-right tabular-nums">{f.responses}</td>
                        <td className="whitespace-nowrap py-1.5 text-xs text-muted-foreground">{formatDate(f.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {p.forms > p.sample.length && <p className="mt-2 text-xs text-muted-foreground">…and {formatNumber(p.forms - p.sample.length)} more.</p>}
              </div>

              <Button variant="destructive" className="gap-2" disabled={stale} onClick={() => setConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete {formatNumber(p.forms)} forms permanently
              </Button>
            </div>
          )}
        </Panel>
      )}

      {result && (
        <div className="flex items-start gap-3 border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-semibold">Cleanup finished</p>
            <p className="text-muted-foreground">
              {result.formsDeleted} forms · {result.responsesDeleted} responses · {result.assets.deleted} Cloudinary assets deleted
              {result.bytesFreed > 0 && ` · ~${formatBytes(result.bytesFreed)} of uploads freed`}
            </p>
            {result.assets.failed > 0 && (
              <p className="mt-1 text-destructive">{result.assets.failed} assets couldn't be deleted from Cloudinary. They're orphaned now; remove them from the Cloudinary console.</p>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        preview={p ?? null}
        pending={cleanup.isPending}
        onConfirm={runDelete}
      />

      <AuditLog />
    </div>
  );
}

function ConfirmDialog({ open, onOpenChange, preview, pending, onConfirm }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preview: FormCleanupPreview | null;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  if (!preview) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!pending) onOpenChange(o);
        if (!o) setTyped("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {formatNumber(preview.forms)} forms forever?</DialogTitle>
          <DialogDescription>
            {formatNumber(preview.responses)} responses, {formatNumber(preview.files.count)} uploaded files and {formatNumber(preview.assets.toDelete)} Cloudinary
            assets will be permanently removed. There is no undo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="cleanup-confirm" className="text-sm">Type <span className="font-mono font-semibold">DELETE</span> to confirm</Label>
          <Input id="cleanup-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={typed !== "DELETE" || pending} onClick={onConfirm}>
            {pending ? "Deleting…" : "Permanently delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditLog() {
  const { data } = useAdminAudit();
  if (!data?.length) return null;
  return (
    <Panel title="Cleanup history">
      <ul className="divide-y divide-border">
        {data.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <span className="font-medium">{a.result.formsDeleted} forms · {a.result.responsesDeleted} responses · {a.result.assets.deleted} assets</span>
            <span className="text-xs text-muted-foreground">
              created {formatDate(a.params.from)} → {formatDate(a.params.to)}
              {a.params.statuses.length > 0 && ` · ${a.params.statuses.join(", ")}`}
              {a.params.onlyTrashed && " · trash only"}
            </span>
            <span className="ml-auto text-xs text-muted-foreground" title={formatDatetime(a.at)}>{a.adminEmail} · {timeAgo(a.at)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Big({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="border border-border p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
