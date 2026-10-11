import { useState } from "react";
import { CreditCard, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCancelPlanRequest, useMyPlanRequests, usePlans, usePlanState, useRequestUpgrade } from "@/hooks/use-plan";
import { formatDate, timeAgo, toastApiError } from "@/lib/utils";
import type { PlanRequest } from "@/types";
import { Meter } from "@/components/admin/admin-ui";
import { PlanCards, PeriodToggle, type BillingPeriod } from "@/components/billing/plan-cards";
import { METRIC_LABEL, PLAN_ORDER, formatLimit, visibleMetrics } from "@/lib/plan-format";

/** First day of next month, local time — when monthly counters reset. */
function nextReset(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 1));
}

export function BillingPage() {
  const { data: state, isLoading } = usePlanState();
  const { data: plans } = usePlans();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const { data: requests } = useMyPlanRequests();
  const requestUpgrade = useRequestUpgrade();
  const pending = requests?.find((r) => r.status === "pending");
  // Show a rejection only while it's the latest thing that happened.
  const rejected = !pending && requests?.[0]?.status === "rejected" ? requests[0] : undefined;

  const ask = (plan: PlanRequest["plan"]) =>
    requestUpgrade.mutate(
      { plan, period },
      { onSuccess: () => toast.success("Request sent. We'll email you once it's approved."), onError: toastApiError }
    );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-border px-4 md:px-8">
        <span className="flex h-9 w-9 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
          <CreditCard className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Plan & usage</h1>
          <p className="text-sm text-muted-foreground">What you're on, what you've used, and what's next</p>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto px-4 py-6 md:px-8">
        {isLoading || !state ? (
          <div className="shimmer h-48" />
        ) : (
          <section className="border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current plan</p>
                <p className="text-2xl font-bold">{state.label}</p>
                <p className="text-xs text-muted-foreground">
                  {state.expiresAt ? `Active until ${formatDate(state.expiresAt)}` : state.plan === "free" ? "Free forever" : "No end date"}
                  {state.assignedPlan !== state.plan && ` · your ${state.assignedPlan} plan has ended`}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Monthly usage resets {formatDate(nextReset(state.period))}</p>
            </div>
            <div className="grid gap-5 p-4 sm:grid-cols-2">
              {visibleMetrics().map((m) => {
                const { used, limit } = state.usage[m];
                const over = limit != null && used > limit;
                return (
                  <div key={m} className="space-y-1.5">
                    <p className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{METRIC_LABEL[m]}</span>
                      <span className="tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{used.toLocaleString("en-IN")}</span> / {formatLimit(limit)}
                      </span>
                    </p>
                    {limit != null ? <Meter value={used} max={limit} label={METRIC_LABEL[m]} /> : <div className="h-1.5 bg-primary/20" />}
                    {over && m !== "liveItems" && (
                      <p className="text-xs text-amber-600">
                        Over your limit. {Math.max(0, Math.floor(limit! * state.grace) - used).toLocaleString("en-IN")} more allowed this month before pausing.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {pending && <PendingRequest request={pending} />}
        {rejected && (
          <div className="flex items-start gap-3 border border-destructive/30 bg-destructive/5 p-4 text-sm" role="status">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p>
              Your request for <span className="font-semibold capitalize">{rejected.plan}</span> wasn't approved
              {rejected.decidedAt ? ` (${formatDate(rejected.decidedAt)})` : ""}.
              {rejected.adminNote && <span className="block text-muted-foreground">“{rejected.adminNote}”</span>}
              <span className="block text-muted-foreground">You can request again anytime.</span>
            </p>
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Plans</h2>
              <p className="text-sm text-muted-foreground">Prices in INR. Exports and analytics are never paywalled; it's your data.</p>
            </div>
            <PeriodToggle value={period} onChange={setPeriod} />
          </div>
          {plans ? (
            <PlanCards
              plans={plans}
              period={period}
              current={state?.plan}
              highlight="plus"
              action={(p) => {
                const cur = state ? PLAN_ORDER[state.plan] : 0;
                if (state?.plan === p.id) {
                  return <div className="flex h-9 items-center justify-center border border-primary bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary">Your plan</div>;
                }
                if (PLAN_ORDER[p.id] < cur) {
                  return <div className="flex h-9 items-center justify-center border border-border text-xs text-muted-foreground">Included in your plan</div>;
                }
                const paid = p.id as PlanRequest["plan"];
                if (pending?.plan === paid && pending.period === period) {
                  return <div className="flex h-9 items-center justify-center border border-amber-500/40 bg-amber-500/10 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Requested</div>;
                }
                return (
                  <Button className="h-9 w-full text-xs font-semibold uppercase tracking-wide" disabled={requestUpgrade.isPending} onClick={() => ask(paid)}>
                    {pending ? `Change request to ${p.label}` : `Request ${p.label}`}
                  </Button>
                );
              }}
            />
          ) : (
            <div className="shimmer h-96" />
          )}
          <p className="text-xs text-muted-foreground">
            Upgrades are approved by our team for now. You stay on your current plan until then, and we'll email you when it's switched.
          </p>
        </section>
      </div>
    </div>
  );
}

function PendingRequest({ request }: { request: PlanRequest }) {
  const cancel = useCancelPlanRequest();
  return (
    <div className="flex flex-wrap items-center gap-3 border border-amber-500/40 bg-amber-500/10 p-4 text-sm" role="status">
      <Clock className="h-4 w-4 shrink-0 text-amber-600" />
      <p className="flex-1">
        Your request for <span className="font-semibold capitalize">{request.plan}</span> ({request.period}) is waiting for approval.
        <span className="block text-xs text-muted-foreground">Sent {timeAgo(request.createdAt)}. We'll email you when it's decided.</span>
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={cancel.isPending}
        onClick={() => cancel.mutate(request.id, { onSuccess: () => toast.success("Request cancelled."), onError: toastApiError })}
      >
        Cancel request
      </Button>
    </div>
  );
}
