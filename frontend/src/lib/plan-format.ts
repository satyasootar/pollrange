import type { PlanCatalogEntry, PlanId, PlanMetric, PlanState } from "@/types";
import { config } from "@/config/config";

export const PLAN_ORDER: Record<PlanId, number> = { free: 0, plus: 1, pro: 2 };

export const METRIC_LABEL: Record<PlanMetric, string> = {
  responses: "Responses this month",
  liveItems: "Live forms & polls",
  uploads: "File uploads this month",
  aiMessages: "AI messages this month",
};

/** Metrics shown to this deployment (AI hidden when the AI UI is off). */
export const visibleMetrics = (): PlanMetric[] =>
  (["responses", "liveItems", "uploads", "aiMessages"] as const).filter((m) => m !== "aiMessages" || config.aiEnabled);

export const formatLimit = (n: number | null) => (n == null ? "Unlimited" : n.toLocaleString("en-IN"));

/** Metrics at or past 80% of a finite limit, highest usage first. */
export function nearLimits(state: PlanState | undefined) {
  if (!state) return [];
  return visibleMetrics()
    .map((m) => ({ metric: m, ...state.usage[m] }))
    .filter((u): u is { metric: PlanMetric; used: number; limit: number } => u.limit != null && u.limit > 0 && u.used / u.limit >= 0.8)
    .sort((a, b) => b.used / b.limit - a.used / a.limit);
}

/** Feature lines for a plan card, generated from the server catalog. */
export function planFeatureLines(p: PlanCatalogEntry): { text: string; included: boolean }[] {
  const lines = [
    { text: `${formatLimit(p.limits.responses)} responses / month`, included: true },
    { text: `${formatLimit(p.limits.liveItems)} live forms & polls`, included: true },
    { text: `${formatLimit(p.limits.uploads)} file uploads / month`, included: true },
    ...(config.aiEnabled ? [{ text: `${formatLimit(p.limits.aiMessages)} AI messages / month`, included: true }] : []),
    { text: "Quizzes, sections, branching, UPI payments", included: true },
    { text: "CSV export & full analytics", included: true },
    { text: "Custom form links", included: p.features.customSlug },
    { text: "Your branding, no Kollects badge", included: p.features.branding },
    { text: `${p.support} support`, included: true },
  ];
  return lines;
}
