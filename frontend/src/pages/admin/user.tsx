import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, BarChart3, FileText, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/dashboard/stat-tile";
import { useAdminUser, useSetUserPlan } from "@/hooks/use-admin";
import { buildFormShareUrl, buildShareUrl, formatDate, formatDatetime, timeAgo, toastApiError } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, Pill } from "@/components/admin/admin-ui";
import { formatNumber, statusTone } from "@/lib/admin-format";
import type { AdminContentItem, AdminUserDetail, PlanId } from "@/types";

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** Assign Free/Plus/Pro with an optional end date (end of that local day). */
function PlanControl({ userId, user }: { userId: string; user: AdminUserDetail["user"] }) {
  const [plan, setPlan] = useState<PlanId>(user.assignedPlan);
  const [until, setUntil] = useState(toDateInput(user.planExpiresAt));
  // Lazy init keeps the impure Date.now() out of render.
  const [tomorrow] = useState(() => toDateInput(new Date(Date.now() + 86_400_000).toISOString()));
  const save = useSetUserPlan(userId);
  const dirty = plan !== user.assignedPlan || until !== toDateInput(user.planExpiresAt);
  const lapsed = user.assignedPlan !== user.plan;

  return (
    <Panel
      title="Plan"
      action={
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          Effective now: <Pill tone={user.plan === "free" ? "muted" : "good"}>{user.plan}</Pill>
          {lapsed && <Pill tone="warn">{user.assignedPlan} expired</Pill>}
        </span>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center border border-border" role="group" aria-label="Plan">
          {(["free", "plus", "pro"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={plan === p}
              onClick={() => setPlan(p)}
              className={`px-3 py-1.5 text-sm capitalize ${plan === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p}
            </button>
          ))}
        </div>
        {plan !== "free" && (
          <div className="space-y-1">
            <Label htmlFor="plan-until" className="text-xs">Active until (optional)</Label>
            <Input id="plan-until" type="date" value={until} min={tomorrow} onChange={(e) => setUntil(e.target.value)} className="w-44" />
          </div>
        )}
        <Button
          disabled={!dirty || save.isPending}
          onClick={() =>
            save.mutate(
              { plan, expiresAt: plan !== "free" && until ? new Date(`${until}T23:59:59.999`).toISOString() : null },
              { onSuccess: (r) => toast.success(`Plan set to ${r.plan}.`), onError: toastApiError }
            )
          }
        >
          {save.isPending ? "Saving…" : "Save plan"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {plan === "free" ? "Free never expires." : until ? `Drops back to Free after ${formatDate(new Date(`${until}T23:59:59`))}.` : "No end date: stays on this plan until changed."} Every change is recorded in the audit log.
      </p>
    </Panel>
  );
}

function ContentTable({ items, kind }: { items: AdminContentItem[]; kind: "poll" | "form" }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No {kind}s yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="pb-2 font-semibold">Title</th>
            <th className="pb-2 font-semibold">Status</th>
            <th className="pb-2 text-right font-semibold">Responses</th>
            <th className="pb-2 font-semibold">Created</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x.id} className={`border-t border-border ${x.isDeleted ? "opacity-50" : ""}`}>
              <td className="max-w-[16rem] py-2">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium" title={x.title}>{x.title}</span>
                  {x.isQuiz && <Pill tone="primary">quiz</Pill>}
                  {x.isDeleted && <Pill tone="bad">deleted</Pill>}
                </span>
              </td>
              <td className="py-2"><Pill tone={statusTone(x.status)}>{x.status}</Pill></td>
              <td className="py-2 text-right font-semibold tabular-nums">{formatNumber(x.responses)}</td>
              <td className="whitespace-nowrap py-2 text-xs text-muted-foreground">{formatDate(x.createdAt)}</td>
              <td className="py-2 text-right">
                {!x.isDeleted && (
                  <a
                    href={kind === "form" ? buildFormShareUrl(x.shareToken) : buildShareUrl(x.shareToken)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    aria-label={`Open ${x.title} public page`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminUserPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAdminUser(userId!);
  const live = (items: AdminContentItem[]) => items.filter((x) => !x.isDeleted);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-border px-4 md:px-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin?tab=users")} aria-label="Back to users">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{data?.user.name ?? "User"}</h1>
          <p className="truncate text-sm text-muted-foreground">{data?.user.email}</p>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8">
        {isError ? (
          <p className="py-16 text-center text-sm text-muted-foreground">User not found.</p>
        ) : isLoading || !data ? (
          <div className="shimmer h-96" />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Pill tone={data.user.provider === "google" ? "primary" : "muted"}>{data.user.provider}</Pill>
              <Pill tone={data.user.isEmailVerified ? "good" : "warn"}>{data.user.isEmailVerified ? "verified" : "unverified"}</Pill>
              <Pill tone={data.user.isActive ? "good" : "bad"}>{data.user.isActive ? "active" : "disabled"}</Pill>
              {!data.user.hasCompletedOnboarding && <Pill tone="warn">onboarding incomplete</Pill>}
              {data.user.onboarding &&
                Object.entries(data.user.onboarding).map(([k, v]) => (
                  <Pill key={k}>
                    {k}: {String(v).replace("_", " ")}
                  </Pill>
                ))}
            </div>

            <PlanControl key={`${data.user.assignedPlan}-${data.user.planExpiresAt}`} userId={userId!} user={data.user} />

            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <StatTile stat={{ label: "Polls", value: live(data.polls).length, icon: BarChart3, color: "text-amber-500" }} />
              <StatTile stat={{ label: "Forms", value: live(data.forms).length, icon: FileText, color: "text-sky-500" }} />
              <StatTile
                stat={{
                  label: "Responses",
                  value: formatNumber([...live(data.polls), ...live(data.forms)].reduce((s, x) => s + x.responses, 0)),
                  icon: MessageSquare,
                  color: "text-emerald-500",
                }}
              />
              <StatTile stat={{ label: "Joined", value: formatDate(data.user.createdAt), icon: Calendar, color: "text-muted-foreground" }} />
            </div>

            <Panel title={`Forms (${data.forms.length})`}>
              <ContentTable items={data.forms} kind="form" />
            </Panel>
            <Panel title={`Polls (${data.polls.length})`}>
              <ContentTable items={data.polls} kind="poll" />
            </Panel>

            <Panel title="Recent sessions">
              {data.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions recorded.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.sessions.map((s, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                      <Pill tone={s.active ? "good" : "muted"}>{s.active ? "active" : "ended"}</Pill>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={s.userAgent}>
                        {s.userAgent || "Unknown device"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{s.ipAddress}</span>
                      <span className="text-xs text-muted-foreground" title={formatDatetime(s.lastUsedAt)}>
                        {timeAgo(s.lastUsedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
