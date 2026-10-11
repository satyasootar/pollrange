import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { usePlanState } from "@/hooks/use-plan";
import { METRIC_LABEL, nearLimits } from "@/lib/plan-format";

const dismissKey = (period: string, metric: string, level: string) => `kollects_usage_banner_${period}_${metric}_${level}`;

/** Dashboard heads-up once any quota passes 80%. Dismissal is per month, metric and level. */
export function UsageBanner() {
  const { data } = usePlanState();
  const [, force] = useState(0);
  const top = nearLimits(data)[0];
  if (!data || !top) return null;

  const over = top.used >= top.limit;
  const key = dismissKey(data.period, top.metric, over ? "over" : "warn");
  try {
    if (localStorage.getItem(key)) return null;
  } catch {
    /* storage blocked: just show it */
  }

  const graceLeft = Math.max(0, Math.floor(top.limit * data.grace) - top.used);
  const label = METRIC_LABEL[top.metric].toLowerCase();
  return (
    <div
      role="status"
      className={`mb-6 flex items-start gap-3 border p-3 text-sm ${over ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/10"}`}
    >
      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${over ? "text-destructive" : "text-amber-600"}`} />
      <p className="flex-1">
        {over ? (
          top.metric === "liveItems" ? (
            <>You're at your limit of {top.limit} live forms & polls. Close one to publish another, or upgrade.</>
          ) : (
            <>
              You've used all {top.limit.toLocaleString("en-IN")} {label} on {data.label}.{" "}
              {graceLeft > 0 ? `We'll keep accepting ${graceLeft.toLocaleString("en-IN")} more so nobody's turned away.` : "New activity is paused until next month."}
            </>
          )
        ) : (
          <>
            You've used {top.used.toLocaleString("en-IN")} of {top.limit.toLocaleString("en-IN")} {label} on {data.label}.
          </>
        )}{" "}
        <Link to="/dashboard/billing" className="font-semibold underline underline-offset-2">See plans</Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => {
          try {
            localStorage.setItem(key, "1");
          } catch {
            /* ignore */
          }
          force((n) => n + 1);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
