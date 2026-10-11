import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, BarChart3, FileText, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/dashboard/stat-tile";
import { useAdminUser } from "@/hooks/use-admin";
import { buildFormShareUrl, buildShareUrl, formatDate, formatDatetime, timeAgo } from "@/lib/utils";
import { Panel, Pill } from "@/components/admin/admin-ui";
import { formatNumber, statusTone } from "@/lib/admin-format";
import type { AdminContentItem } from "@/types";

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
