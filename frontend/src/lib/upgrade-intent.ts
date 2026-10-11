import type { BillingPeriod, PlanRequest } from "@/types";

/**
 * Remembers "I clicked Get Plus" across sign-up (incl. the Google OAuth redirect),
 * so the request is filed once the new account reaches the app. Expires after a day.
 */
const KEY = "kollects_upgrade_intent";
const TTL = 24 * 60 * 60 * 1000;

export interface UpgradeIntent {
  plan: PlanRequest["plan"];
  period: BillingPeriod;
}

export function saveUpgradeIntent(intent: UpgradeIntent) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...intent, at: Date.now() }));
  } catch {
    /* storage blocked: the user can still request from the billing page */
  }
}

export function readUpgradeIntent(): UpgradeIntent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as UpgradeIntent & { at: number };
    if (Date.now() - v.at > TTL || (v.plan !== "plus" && v.plan !== "pro") || (v.period !== "monthly" && v.period !== "yearly")) {
      localStorage.removeItem(KEY);
      return null;
    }
    return { plan: v.plan, period: v.period };
  } catch {
    return null;
  }
}

export function clearUpgradeIntent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
