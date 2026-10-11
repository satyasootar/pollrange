import { useEffect, useState } from "react";
import { readUpgradeIntent } from "@/lib/upgrade-intent";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import { usePlans } from "@/hooks/use-plan";
import { PlanCards, PeriodToggle, type BillingPeriod } from "@/components/billing/plan-cards";

export function StepPlan() {
  const { form, setField, nextStep, prevStep } = useOnboardingStore();
  const { data: plans, isLoading } = usePlans();
  const [period, setPeriod] = useState<BillingPeriod>(() => readUpgradeIntent()?.period ?? "monthly");

  // Came from "Get Plus" on the pricing page? Pre-select that plan.
  useEffect(() => {
    const intent = readUpgradeIntent();
    if (intent && !form.plan) setField("plan", intent.plan);
  }, [form.plan, setField]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Which plan fits you?</h2>
          <p className="text-sm text-muted-foreground">Everyone starts on Free. Upgrade anytime from Plan & usage.</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {isLoading || !plans ? (
        <div className="shimmer h-96" />
      ) : (
        <PlanCards
          plans={plans}
          period={period}
          highlight="plus"
          action={(plan) => {
            const selected = form.plan === plan.id;
            return (
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setField("plan", plan.id)}
                className={cn(
                  "flex h-8 w-full items-center justify-center border text-xs font-semibold uppercase tracking-wide",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {selected ? "Selected" : plan.priceMonthly === 0 ? "Start free" : "I'm interested"}
              </button>
            );
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={prevStep} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <Button type="button" disabled={!form.plan} onClick={nextStep}>
          Next →
        </Button>
      </div>
    </div>
  );
}
