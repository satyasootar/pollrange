import { cn } from "@/lib/utils";
import { StatTile, type Stat } from "./stat-tile";

export function StatsRow({
  stats,
  isCompact,
  className,
}: {
  stats: Stat[];
  isCompact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat) => (
        <StatTile key={stat.label} stat={stat} isCompact={isCompact} />
      ))}
    </div>
  );
}
