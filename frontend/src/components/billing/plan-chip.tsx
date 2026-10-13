import { Link } from "react-router-dom";
import { Crown, Gem, Leaf } from "lucide-react";
import { usePlanState } from "@/hooks/use-plan";
import { cn, formatDate } from "@/lib/utils";
import type { PlanId } from "@/types";

const STYLE: Record<PlanId, { icon: typeof Leaf; className: string }> = {
  free: { icon: Leaf, className: "border-border bg-muted/40 text-muted-foreground hover:text-foreground" },
  plus: { icon: Gem, className: "border-primary/40 bg-primary/10 text-primary" },
  pro: { icon: Crown, className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

/** Current-plan badge; links to Plan & usage. Renders nothing until the plan is known. */
export function PlanChip({ className }: { className?: string }) {
  const { data } = usePlanState();
  if (!data) return null;
  const { icon: Icon, className: tone } = STYLE[data.plan];
  const title = data.expiresAt ? `${data.label} plan · active until ${formatDate(data.expiresAt)}` : `${data.label} plan`;
  return (
    <Link
      to="/dashboard/billing"
      title={title}
      aria-label={`${title}. View plan and usage`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
        tone,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {data.label}
    </Link>
  );
}
