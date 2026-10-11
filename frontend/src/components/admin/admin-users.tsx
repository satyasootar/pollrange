import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdminUsers } from "@/hooks/use-admin";
import { formatDate, timeAgo } from "@/lib/utils";
import { Pill } from "./admin-ui";
import type { PlanId } from "@/types";
import { formatNumber } from "@/lib/admin-format";

export function AdminUsersTab() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<PlanId | undefined>();
  const deferred = useDeferredValue(search.trim());
  const { data, isLoading, isFetching } = useAdminUsers(page, deferred, plan);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            aria-label="Search users"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border" role="group" aria-label="Filter by plan">
            {([undefined, "free", "plus", "pro"] as const).map((p) => (
              <button
                key={p ?? "all"}
                type="button"
                aria-pressed={plan === p}
                onClick={() => {
                  setPlan(p);
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs capitalize ${plan === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p ?? "All"}
              </button>
            ))}
          </div>
          {data && <p className="text-xs text-muted-foreground">{formatNumber(data.pagination.total)} users</p>}
        </div>
      </div>

      <div className={`overflow-x-auto border border-border bg-card transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3 font-semibold">User</th>
              <th className="p-3 font-semibold">Plan</th>
              <th className="p-3 font-semibold">Sign-in</th>
              <th className="p-3 text-right font-semibold">Polls</th>
              <th className="p-3 text-right font-semibold">Forms</th>
              <th className="p-3 text-right font-semibold">Responses</th>
              <th className="p-3 font-semibold">Joined</th>
              <th className="p-3 font-semibold">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-t border-border"><td colSpan={8} className="p-3"><div className="shimmer h-8" /></td></tr>
                ))
              : data?.items.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    className="cursor-pointer border-t border-border hover:bg-muted/50"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted text-xs font-semibold">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate font-medium">
                            {u.name}
                            {!u.isActive && <Pill tone="bad">disabled</Pill>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Pill tone={u.plan === "free" ? "muted" : "good"}>{u.plan}</Pill>
                    </td>
                    <td className="p-3">
                      <span className="flex flex-wrap gap-1">
                        <Pill tone={u.provider === "google" ? "primary" : "muted"}>{u.provider}</Pill>
                        {!u.isEmailVerified && <Pill tone="warn">unverified</Pill>}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums">{u.polls}</td>
                    <td className="p-3 text-right tabular-nums">{u.forms}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">{formatNumber(u.responses)}</td>
                    <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{u.lastSeenAt ? timeAgo(u.lastSeenAt) : "—"}</td>
                  </tr>
                ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">No users match “{deferred}”.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">Page {page} of {data.pagination.totalPages}</span>
          <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
