import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { DashboardTopItem } from "@/types";

interface Props {
  title: string;
  items: DashboardTopItem[];
  /** CSS color for the bar fill (e.g. "var(--chart-1)"). */
  accent: string;
  onSelect: (id: string) => void;
  emptyLabel: string;
}

export function TopList({ title, items, accent, onSelect, emptyLabel }: Props) {
  const max = Math.max(1, ...items.map((i) => i.responses));

  return (
    <div className="border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="group block w-full text-left"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{item.title || "Untitled"}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{item.responses}</span>
                </div>
                <div className="h-2 w-full bg-muted">
                  <motion.div
                    className="h-full"
                    style={{ background: accent }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.responses / max) * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
