import { memo } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface Stat {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

interface StatTileProps {
  stat: Stat;
  isCompact?: boolean;
}

/**
 * A single dashboard stat card. Memoized on the stat's own fields (not just
 * prop identity) so switching between pages that share a tile's label/icon —
 * e.g. "Total Responses" on both the Polls and Forms dashboards — only
 * updates the changed value instead of re-rendering the whole tile.
 */
export const StatTile = memo(
  function StatTile({ stat, isCompact }: StatTileProps) {
    return (
      <div
        className={cn(
          "group border-2 border-border bg-card p-4 shadow-none transition-colors hover:border-primary/40 sm:p-5",
          isCompact && "p-3 sm:p-4"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
              {stat.label}
            </span>
            <p className="mt-1.5 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl">{stat.value}</p>
          </div>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center border border-current/30 bg-current/10",
              stat.color,
              isCompact && "h-7 w-7"
            )}
          >
            <stat.icon className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.isCompact === next.isCompact &&
    prev.stat.label === next.stat.label &&
    prev.stat.value === next.stat.value &&
    prev.stat.color === next.stat.color &&
    prev.stat.icon === next.stat.icon
);
