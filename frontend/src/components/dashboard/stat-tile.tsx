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
          "group border border-border bg-card p-3 shadow-none transition-colors hover:border-primary/40 sm:border-2 sm:p-5",
          isCompact && "p-3 sm:p-4"
        )}
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <span className="block truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
              {stat.label}
            </span>
            <p className="mt-1 text-lg font-bold tabular-nums sm:mt-2 sm:text-3xl">{stat.value}</p>
          </div>
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center border border-current/30 bg-current/10 sm:h-9 sm:w-9",
              stat.color,
              isCompact && "h-7 w-7"
            )}
          >
            <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
