import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import { PLAN_OPTIONS } from "./onboarding-config";

export function StepPlan() {
  const { form, setField, nextStep, prevStep } = useOnboardingStore();

  return (
    <div className="mx-auto max-w-4xl px-8 py-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Choose your plan</h2>
        <p className="text-sm text-muted-foreground">You can change this anytime.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLAN_OPTIONS.map((plan) => {
          const selected = form.plan === plan.value;
          return (
            <button
              key={plan.value}
              type="button"
              onClick={() => setField("plan", plan.value)}
              className={cn(
                "relative flex h-full flex-col border-2 p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
                selected ? "border-primary bg-primary/10" : "border-border"
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-4 border-2 border-primary bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {plan.badge}
                </span>
              )}

              <p className="text-base font-semibold">{plan.label}</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">{plan.price}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{plan.blurb}</p>

              <ul className="mt-4 flex-1 space-y-2 border-t border-border pt-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div
                className={cn(
                  "mt-4 flex h-8 items-center justify-center border text-xs font-semibold uppercase tracking-wide",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                )}
              >
                {selected ? "Selected" : "Select"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
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
