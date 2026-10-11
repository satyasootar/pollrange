import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminPlanRequests, useDecidePlanRequest } from "@/hooks/use-admin";
import { formatDate, formatDatetime, timeAgo, toastApiError } from "@/lib/utils";
import { Panel, Pill } from "./admin-ui";
import type { AdminPlanRequest } from "@/types";

const dateInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Default end date matching what they're paying for: +1 month or +1 year. */
function defaultUntil(period: AdminPlanRequest["period"]) {
  const d = new Date();
  if (period === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return dateInput(d);
}

const STATUS_TONE = { pending: "warn", approved: "good", rejected: "bad", cancelled: "muted" } as const;

export function AdminUpgradesTab() {
  const { data, isLoading } = useAdminPlanRequests();
  if (isLoading || !data) return <div className="shimmer h-64" />;

  const pending = data.filter((r) => r.status === "pending");
  const decided = data.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <Panel title={`Waiting for you (${pending.length})`}>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending upgrade requests.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((r) => <PendingRow key={r.id} r={r} />)}
          </ul>
        )}
      </Panel>

      {decided.length > 0 && (
        <Panel title="History">
          <ul className="divide-y divide-border">
            {decided.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>
                <span className="font-medium">{r.user?.name ?? "Deleted user"}</span>
                <span className="text-xs text-muted-foreground">→ {r.plan} ({r.period})</span>
                {r.adminNote && <span className="text-xs text-muted-foreground">“{r.adminNote}”</span>}
                <span className="ml-auto text-xs text-muted-foreground" title={formatDatetime(r.decidedAt ?? r.createdAt)}>
                  {timeAgo(r.decidedAt ?? r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function PendingRow({ r }: { r: AdminPlanRequest }) {
  const decide = useDecidePlanRequest();
  const [until, setUntil] = useState(() => defaultUntil(r.period));
  const [noEnd, setNoEnd] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  // Lazy init keeps the impure Date.now() out of render.
  const [tomorrow] = useState(() => dateInput(new Date(Date.now() + 86_400_000)));

  const approve = () =>
    decide.mutate(
      { id: r.id, approve: true, expiresAt: noEnd ? null : new Date(`${until}T23:59:59.999`).toISOString() },
      { onSuccess: () => toast.success(`${r.user?.name ?? "User"} is now on ${r.plan}.`), onError: toastApiError }
    );
  const reject = () =>
    decide.mutate(
      { id: r.id, approve: false, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      { onSuccess: () => toast.success("Request rejected."), onError: toastApiError }
    );

  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          {r.user ? (
            <Link to={`/admin/users/${r.user.id}`} className="font-semibold hover:text-primary">{r.user.name}</Link>
          ) : (
            <span className="font-semibold">Deleted user</span>
          )}
          <p className="truncate text-xs text-muted-foreground">{r.user?.email}</p>
        </div>
        <span className="flex items-center gap-2 text-sm">
          <Pill tone="muted">{r.user?.plan ?? "free"}</Pill>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <Pill tone="good">{r.plan}</Pill>
          <span className="text-xs capitalize text-muted-foreground">{r.period}</span>
        </span>
        <span className="text-xs text-muted-foreground" title={formatDatetime(r.createdAt)}>{timeAgo(r.createdAt)}</span>
      </div>
      {r.note && <p className="border-l-2 border-border pl-3 text-sm text-muted-foreground">“{r.note}”</p>}

      {rejecting ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1 space-y-1">
            <Label htmlFor={`reason-${r.id}`} className="text-xs">Reason (sent to the user, optional)</Label>
            <Input id={`reason-${r.id}`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Payment not received yet" />
          </div>
          <Button variant="destructive" disabled={decide.isPending} onClick={reject}>Confirm reject</Button>
          <Button variant="ghost" disabled={decide.isPending} onClick={() => setRejecting(false)}>Back</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor={`until-${r.id}`} className="text-xs">Active until</Label>
            <Input id={`until-${r.id}`} type="date" value={until} min={tomorrow} disabled={noEnd} onChange={(e) => setUntil(e.target.value)} className="w-44" />
          </div>
          <label className="flex items-center gap-1.5 pb-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} className="accent-primary" />
            No end date
          </label>
          <Button className="gap-1.5" disabled={decide.isPending || (!noEnd && !until)} onClick={approve}>
            <Check className="h-4 w-4" /> Approve
          </Button>
          <Button variant="outline" className="gap-1.5" disabled={decide.isPending} onClick={() => setRejecting(true)}>
            <X className="h-4 w-4" /> Reject
          </Button>
          {!noEnd && until && <span className="pb-2 text-xs text-muted-foreground">Back to Free after {formatDate(new Date(`${until}T23:59:59`))}</span>}
        </div>
      )}
    </li>
  );
}
