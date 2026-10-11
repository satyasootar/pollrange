/**
 * Plan catalog — the single source of truth. Served at GET /api/plans so the
 * onboarding, pricing and billing UIs render from here and never drift.
 * Limits only sit where real cost lives (responses, uploads, AI); features stay open.
 */
export const PLAN_IDS = ["free", "plus", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type Metric = "responses" | "uploads" | "aiMessages";
export type Feature = "customSlug" | "branding";

export interface PlanDef {
  id: PlanId;
  label: string;
  tagline: string;
  priceMonthly: number; // INR
  priceYearly: number; // INR
  limits: Record<Metric, number> & { liveItems: number }; // Infinity = unlimited
  features: Record<Feature, boolean>;
  support: string;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    label: "Free",
    tagline: "Everything you need to run real polls and forms.",
    priceMonthly: 0,
    priceYearly: 0,
    limits: { responses: 1_000, liveItems: 10, uploads: 100, aiMessages: 30 },
    features: { customSlug: false, branding: false },
    support: "Community",
  },
  plus: {
    id: "plus",
    label: "Plus",
    tagline: "For regular events, classes and teams.",
    priceMonthly: 299,
    priceYearly: 2_990,
    limits: { responses: 10_000, liveItems: 50, uploads: 2_000, aiMessages: 300 },
    features: { customSlug: true, branding: true },
    support: "Email",
  },
  pro: {
    id: "pro",
    label: "Pro",
    tagline: "High volume, no ceilings on what's live.",
    priceMonthly: 799,
    priceYearly: 7_990,
    limits: { responses: 100_000, liveItems: Infinity, uploads: 20_000, aiMessages: 2_000 },
    features: { customSlug: true, branding: true },
    support: "Priority email",
  },
};

/** Usage may run this far past a limit before new activity pauses. */
export const GRACE = 1.2;
/** Creators get a heads-up at this fraction of a limit. */
export const WARN_AT = 0.8;

/** The plan a user is actually entitled to right now; a lapsed plan falls back to Free. */
export function effectivePlan(user: { plan?: { id?: string | null; expiresAt?: Date | null } | null } | null | undefined, now = new Date()): PlanId {
  const id = user?.plan?.id;
  if (!id || !(PLAN_IDS as readonly string[]).includes(id)) return "free";
  if (user?.plan?.expiresAt && new Date(user.plan.expiresAt) <= now) return "free";
  return id as PlanId;
}

/** JSON-safe catalog (Infinity → null) for the public endpoint. */
export function publicCatalog() {
  return PLAN_IDS.map((id) => {
    const p = PLANS[id];
    const limits = Object.fromEntries(Object.entries(p.limits).map(([k, v]) => [k, Number.isFinite(v) ? v : null]));
    return { ...p, limits };
  });
}
