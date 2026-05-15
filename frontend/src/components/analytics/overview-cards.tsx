import { motion, AnimatePresence } from "framer-motion";
import type { FullAnalytics } from "@/types";
import { Users, TrendingUp, CheckSquare, UserCheck } from "lucide-react";
import { numberPulse } from "@/lib/animations";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  animate,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  animate?: boolean;
}) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <motion.p
        key={value}
        variants={animate ? numberPulse : undefined}
        initial={animate ? "idle" : undefined}
        animate={animate ? "updated" : undefined}
        className="mt-2 text-3xl font-bold tabular-nums"
      >
        {value}
      </motion.p>
    </div>
  );
}

interface OverviewCardsProps {
  analytics: FullAnalytics;
  realtimeTotal: number | null;
}

export function OverviewCards({ analytics, realtimeTotal }: OverviewCardsProps) {
  const total = realtimeTotal ?? analytics.totalResponses;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Responses"
        value={total}
        icon={Users}
        color="text-primary"
        animate={realtimeTotal !== null}
      />
      <StatCard
        label="Completion Rate"
        value={`${Math.round(analytics.completionRate)}%`}
        icon={CheckSquare}
        color="text-emerald-500"
      />
      <StatCard
        label="Anonymous"
        value={analytics.anonymousCount}
        icon={UserCheck}
        color="text-amber-500"
      />
      <StatCard
        label="Authenticated"
        value={analytics.authenticatedCount}
        icon={TrendingUp}
        color="text-blue-500"
      />
    </div>
  );
}
