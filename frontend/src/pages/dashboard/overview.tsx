import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Activity, BarChart3, FileText, type LucideIcon } from "lucide-react";
import { useDashboardOverview } from "@/hooks/use-dashboard";
import { useAuthStore } from "@/store/use-auth-store";
import { ResponsesAreaChart } from "@/components/dashboard/responses-area-chart";
import { SplitDonut } from "@/components/dashboard/split-donut";
import { StatusChart } from "@/components/dashboard/status-chart";
import { TopList } from "@/components/dashboard/top-list";
import { fadeUp, stagger } from "@/lib/animations";
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
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {/* Stats row */}
        <motion.div
          className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="group border-2 border-border bg-card p-4 transition-colors hover:border-primary/40 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                    {stat.label}
                  </span>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl">
                    {isLoading ? <span className="shimmer inline-block h-8 w-16" /> : stat.value}
                  </p>
                </div>
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center border border-current/30 bg-current/10", stat.color)}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="shimmer h-80 w-full" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="shimmer h-64 w-full" />
              <div className="shimmer h-64 w-full" />
            </div>
          </div>
        ) : (
          <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp}>
              <ResponsesAreaChart data={data?.timeline ?? []} groupBy={groupBy} onGroupByChange={setGroupBy} />
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div variants={fadeUp}>
                <SplitDonut polls={data?.responsesSplit.polls ?? 0} forms={data?.responsesSplit.forms ?? 0} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatusChart data={data?.statusBreakdown ?? []} />
              </motion.div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div variants={fadeUp}>
                <TopList
                  title="Top polls"
                  items={data?.topPolls ?? []}
                  accent="var(--chart-1)"
                  onSelect={(id) => navigate(`/polls/${id}/analytics`)}
                  emptyLabel="No polls yet."
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <TopList
                  title="Top forms"
                  items={data?.topForms ?? []}
                  accent="var(--chart-3)"
                  onSelect={(id) => navigate(`/forms/${id}/analytics`)}
                  emptyLabel="No forms yet."
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
