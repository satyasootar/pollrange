import { config } from "@/config/config";
import { CONSENT_EVENT, readConsent, type Consent } from "@/lib/consent";

/**
 * First-party analytics. Nothing here runs until the visitor allows it:
 *  - analytics consent → kl_vid (anonymous visitor, ~13 months) and kl_sid (session, 30 min idle)
 *  - marketing consent → kl_ft (first visit's source, ~13 months) and kl_lt (latest campaign, 30 days)
 * Respondent pages (/p/…, /f/…) are never tracked: those people are our creators' audience.
 */
export const TRACKING_COOKIES = {
  visitor: { name: "kl_vid", maxAge: 60 * 60 * 24 * 395 },
  session: { name: "kl_sid", maxAge: 60 * 30 },
  firstTouch: { name: "kl_ft", maxAge: 60 * 60 * 24 * 395 },
  lastTouch: { name: "kl_lt", maxAge: 60 * 60 * 24 * 30 },
} as const;

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  referrer?: string;
  landingPage?: string;
  at?: string;
}

interface TrackedEvent {
  type: "pageview" | "event";
  name?: string;
  path: string;
  title?: string;
  referrer?: string;
  props?: Record<string, string | number | boolean>;
}

const RESPONDENT_PAGE = /^\/(p|f)\//;

function getCookie(name: string) {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return raw ? decodeURIComponent(raw.slice(name.length + 1)) : null;
}
function setCookie(name: string, value: string, maxAge: number) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}
const deleteCookie = (name: string) => (document.cookie = `${name}=; Max-Age=0; Path=/`);
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
const readJson = (name: string): Attribution | undefined => {
  try {
    return JSON.parse(getCookie(name) ?? "") as Attribution;
  } catch {
    return undefined;
  }
};

/** Referring site, ignoring our own pages. */
function externalReferrer() {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    return ref && ref.host !== location.host ? ref.href : undefined;
  } catch {
    return undefined;
  }
}

/** Set once this page load's entry has been attributed / its first page view sent. */
let attributed = false;
let landed = false;
/**
 * The URL this page load arrived on. Kept in memory (no cookie, so no consent needed) so a
 * visitor who opts in after navigating still gets their real UTM tags and landing page.
 */
const landing = typeof location === "undefined" ? { search: "", path: "/" } : { search: location.search, path: location.pathname };

/**
 * Records where this visit came from (UTM tags or an external referrer) in kl_ft / kl_lt.
 * Once per page load: SPA navigations keep the original document.referrer and would
 * otherwise re-attribute every in-app page. Needs analytics too: the cookies are only
 * ever read to send with analytics events.
 */
export function captureAttribution() {
  const consent = readConsent();
  if (attributed || !consent?.marketing || !consent.analytics) return;
  attributed = true;
  const q = new URLSearchParams(landing.search);
  const ref = externalReferrer();
  const refHost = ref ? new URL(ref).host.replace(/^www\./, "") : undefined;
  const touch: Attribution = Object.fromEntries(
    Object.entries({
      source: q.get("utm_source") ?? refHost,
      medium: q.get("utm_medium") ?? (refHost ? "referral" : undefined),
      campaign: q.get("utm_campaign"),
      term: q.get("utm_term"),
      content: q.get("utm_content"),
      referrer: ref,
      landingPage: landing.path,
      at: new Date().toISOString(),
    }).filter(([, v]) => v)
  );
  const { firstTouch, lastTouch } = TRACKING_COOKIES;
  if (!getCookie(firstTouch.name)) setCookie(firstTouch.name, JSON.stringify(touch.source ? touch : { ...touch, source: "direct" }), firstTouch.maxAge);
  if (touch.source) setCookie(lastTouch.name, JSON.stringify(touch), lastTouch.maxAge);
}

/** Returns whether anything was sent (false without analytics consent or on respondent pages). */
function send(events: TrackedEvent[]): boolean {
  const consent = readConsent();
  if (!consent?.analytics || RESPONDENT_PAGE.test(location.pathname)) return false;
  const { visitor, session, firstTouch, lastTouch } = TRACKING_COOKIES;
  const visitorId = getCookie(visitor.name) ?? newId();
  const sessionId = getCookie(session.name) ?? newId();
  setCookie(visitor.name, visitorId, visitor.maxAge);
  setCookie(session.name, sessionId, session.maxAge); // sliding 30-minute idle window

  const utm: Attribution = { ...((consent.marketing && readJson(lastTouch.name)) || {}) };
  delete utm.at;
  const body = {
    visitorId,
    sessionId,
    events,
    ...(consent.marketing && Object.keys(utm).length ? { utm } : {}),
    ...(consent.marketing && readJson(firstTouch.name) ? { firstTouch: readJson(firstTouch.name) } : {}),
  };
  void fetch(`${config.apiUrl}/site/events`, {
    method: "POST",
    credentials: "include", // lets the server link a signed-in user to their first-touch source
    keepalive: true, // survives navigating away
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
  return true;
}

export function trackPageview(path = location.pathname) {
  if (RESPONDENT_PAGE.test(path)) return;
  captureAttribution();
  const ref = externalReferrer();
  const sent = send([
    {
      type: "pageview",
      path,
      title: document.title.slice(0, 200),
      // Only the page load's own referrer is meaningful; later SPA navigations are internal.
      ...(!landed && ref ? { referrer: ref } : {}),
    },
  ]);
  if (sent) landed = true;
}

/** Product event, e.g. track("poll_created"). snake_case names only. */
export function track(name: string, props?: TrackedEvent["props"]) {
  void send([{ type: "event", name, path: location.pathname, ...(props ? { props } : {}) }]);
}

/** Withdrawn consent deletes what we stored; granting it mid-visit counts the current page. */
export function watchConsent(onGranted: () => void) {
  // Only a fresh grant counts the current page; re-saving with analytics already on must not.
  let had = !!readConsent()?.analytics;
  const handler = (e: Event) => {
    const c = (e as CustomEvent<Consent>).detail;
    const { visitor, session, firstTouch, lastTouch } = TRACKING_COOKIES;
    if (!c.analytics) [visitor, session].forEach((k) => deleteCookie(k.name));
    if (!c.marketing) [firstTouch, lastTouch].forEach((k) => deleteCookie(k.name));
    captureAttribution();
    if (c.analytics && !had) onGranted();
    had = c.analytics;
  };
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
