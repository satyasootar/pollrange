import api from "@/lib/api";

/**
 * Cookie consent. The choice itself lives in a first-party cookie (strictly necessary,
 * so it needs no consent). Optional tracking (see lib/tracker.ts) checks `readConsent()`
 * before it runs and listens for CONSENT_EVENT to start or stop when the visitor changes it.
 * Every decision is also logged server-side as proof of consent.
 */
export interface ConsentChoice {
  /** Anonymous visitor/session IDs, pages viewed, referring site, device type. */
  analytics: boolean;
  /** Campaign attribution: which campaign or site first brought the visitor here. */
  marketing: boolean;
}

export interface Consent extends ConsentChoice {
  /** Random ID for this browser's consent, so its decisions can be looked up later. */
  id: string;
  /** When the choice was made (ISO). */
  at: string;
  /** Bump CONSENT_VERSION when categories change; older choices are re-asked. */
  v: number;
}

export type ConsentAction = "accept_all" | "reject_all" | "custom";

export const CONSENT_VERSION = 2;
const COOKIE = "kollects_consent";
const MAX_AGE = 60 * 60 * 24 * 180; // re-ask after ~6 months
/** Fired on window with the new Consent as `detail` whenever the visitor saves a choice. */
export const CONSENT_EVENT = "kollects:consent";
/** Fired on window to reopen the preferences (footer "Cookie settings" link). */
export const COOKIE_SETTINGS_EVENT = "kollects:cookie-settings";

function readRaw(): Partial<Consent> | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1))) as Partial<Consent>;
  } catch {
    return null;
  }
}

/** The visitor's current choice, or null if they haven't chosen (or chose under an older policy). */
export function readConsent(): Consent | null {
  const c = readRaw();
  return c?.v === CONSENT_VERSION && typeof c.analytics === "boolean" && typeof c.marketing === "boolean" && c.id ? (c as Consent) : null;
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

/** Browser sent the Global Privacy Control signal (a standing "don't track me"). */
export const hasGpc = () => typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

export function saveConsent(choice: ConsentChoice, action: ConsentAction, source: "banner" | "settings"): Consent {
  // Keep the same id across re-decisions (and policy versions) so its history stays linked.
  const consent: Consent = { ...choice, id: readRaw()?.id ?? newId(), at: new Date().toISOString(), v: CONSENT_VERSION };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
  // Proof of consent; a failed log must never block the visitor.
  void api
    .post("/site/consent", {
      consentId: consent.id,
      ...choice,
      action,
      version: CONSENT_VERSION,
      source,
      page: location.pathname,
      gpc: hasGpc(),
    })
    .catch(() => {});
  return consent;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}
