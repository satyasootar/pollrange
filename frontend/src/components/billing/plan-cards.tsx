import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatInr } from "@/lib/upi-payment";
import { planFeatureLines } from "@/lib/plan-format";
import type { BillingPeriod, PlanCatalogEntry, PlanId } from "@/types";

export type { BillingPeriod };

export function PeriodToggle({ value, onChange }: { value: BillingPeriod; onChange: (v: BillingPeriod) => void }) {
  return (
    <div className="inline-flex items-center border border-border" role="group" aria-label="Billing period">
      {(["monthly", "yearly"] as const).map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={value === p}
          onClick={() => onChange(p)}
          className={cn("px-3 py-1.5 text-xs capitalize", value === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {p}
          {p === "yearly" && <span className="ml-1 opacity-80">(2 months free)</span>}
        </button>
      ))}
    </div>
  );
}

/** Plan comparison cards rendered from the server catalog. `action` renders each card's footer. */
export function PlanCards({
  plans,
  period,
  highlight,
  current,
  action,
}: {
  plans: PlanCatalogEntry[];
  period: BillingPeriod;
  highlight?: PlanId;
  current?: PlanId | undefined;
  action: (plan: PlanCatalogEntry) => ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {plans.map((p) => {
        const price = period === "yearly" ? p.priceYearly : p.priceMonthly;
        const isCurrent = current === p.id;
        const featured = highlight === p.id;
        return (
          <div
            key={p.id}
            className={cn("relative flex flex-col border-2 bg-card p-5", isCurrent || featured ? "border-primary" : "border-border")}
            aria-label={`${p.label} plan`}
          >
            {(isCurrent || featured) && (
              <span className="absolute -top-3 left-4 border-2 border-primary bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {isCurrent ? "Current plan" : "Most popular"}
              </span>
            )}
            <p className="text-base font-semibold">{p.label}</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold tabular-nums">{price === 0 ? "₹0" : formatInr(price)}</span>
              <span className="text-xs text-muted-foreground">{price === 0 ? "forever" : period === "yearly" ? "/ year" : "/ month"}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
            <ul className="mt-4 flex-1 space-y-2 border-t border-border pt-4">
              {planFeatureLines(p).map((f) => (
                <li key={f.text} className={cn("flex items-start gap-2 text-xs", !f.included && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                  {f.included ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> : <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">{action(p)}</div>
          </div>
        );
      })}
    </div>
  );
}
