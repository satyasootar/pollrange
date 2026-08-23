import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Activity, BarChart3, FileText, Sparkles, type LucideIcon } from "lucide-react";
import { useDashboardOverview } from "@/hooks/use-dashboard";
import { useAuthStore } from "@/store/use-auth-store";
import { ResponsesAreaChart } from "@/components/dashboard/responses-area-chart";
import { SplitDonut } from "@/components/dashboard/split-donut";
import { StatusChart } from "@/components/dashboard/status-chart";
import { TopList } from "@/components/dashboard/top-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TimelineGranularity } from "@/types";

export function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [groupBy, setGroupBy] = useState<TimelineGranularity>("day");
  const { data, isLoading } = useDashboardOverview(groupBy);

  const stats: { label: string; value: number; icon: LucideIcon; color: string }[] = [
    { label: "Total Responses", value: data?.totals.responses ?? 0, icon: Users, color: "text-primary" },
    { label: "Active", value: data?.totals.active ?? 0, icon: Activity, color: "text-emerald-500" },
    { label: "Polls", value: data?.totals.polls ?? 0, icon: BarChart3, color: "text-amber-500" },
    { label: "Forms", value: data?.totals.forms ?? 0, icon: FileText, color: "text-muted-foreground" },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-4 md:px-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Overview{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">Analytics across all your polls and forms</p>
        </div>
        <Button onClick={() => navigate("/dashboard/chat")} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Draft with AI
        </Button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group border border-border bg-card p-3 transition-colors hover:border-primary/40 sm:border-2 sm:p-5"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <span className="block truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                    {stat.label}
                  </span>
                  <p className="mt-1 text-lg font-bold tabular-nums sm:mt-2 sm:text-3xl">
                    {isLoading ? <span className="shimmer inline-block h-8 w-16" /> : stat.value}
                  </p>
                </div>
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center border border-current/30 bg-current/10 sm:h-9 sm:w-9", stat.color)}>
                  <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="shimmer h-80 w-full" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="shimmer h-64 w-full" />
              <div className="shimmer h-64 w-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <ResponsesAreaChart data={data?.timeline ?? []} groupBy={groupBy} onGroupByChange={setGroupBy} />

            <div className="grid gap-6 lg:grid-cols-2">
              <SplitDonut polls={data?.responsesSplit.polls ?? 0} forms={data?.responsesSplit.forms ?? 0} />
              <StatusChart data={data?.statusBreakdown ?? []} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <TopList
                title="Top polls"
                items={data?.topPolls ?? []}
                accent="var(--chart-1)"
                onSelect={(id) => navigate(`/polls/${id}/analytics`)}
                emptyLabel="No polls yet."
              />
              <TopList
                title="Top forms"
                items={data?.topForms ?? []}
                accent="var(--chart-3)"
                onSelect={(id) => navigate(`/forms/${id}/analytics`)}
                emptyLabel="No forms yet."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
