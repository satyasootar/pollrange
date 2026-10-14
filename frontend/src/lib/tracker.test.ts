import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { saveConsent } from "@/lib/consent";
import { testState } from "@/test/msw/handlers";

/** Shape of a /site/events request body, as the tests read it. */
type SentBatch = { visitorId: string; events: Record<string, unknown>[]; utm?: Record<string, string>; firstTouch?: Record<string, string> };

const cookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
const clearCookies = () =>
  document.cookie.split("; ").forEach((c) => (document.cookie = `${c.split("=")[0]}=; Max-Age=0; Path=/`));

/** Fresh module per test: the tracker remembers per page load whether it attributed the visit. */
async function loadTracker() {
  vi.resetModules();
  return import("@/lib/tracker");
}

describe("tracker", () => {
  beforeEach(() => {
    clearCookies();
    window.history.replaceState(null, "", "/");
  });

  it("does nothing without consent", async () => {
    const { trackPageview, track } = await loadTracker();
    trackPageview("/");
    track("signup");
    await new Promise((r) => setTimeout(r, 20));
    expect(testState.siteEvents).toHaveLength(0);
    expect(cookie("kl_vid")).toBeUndefined();
  });

  it("with analytics only: sets visitor + session cookies, sends page views, no campaign data", async () => {
    saveConsent({ analytics: true, marketing: false }, "custom", "banner");
    window.history.replaceState(null, "", "/?utm_source=newsletter");
    const { trackPageview, track } = await loadTracker();
    trackPageview("/");
    track("poll_created");
    await waitFor(() => expect(testState.siteEvents).toHaveLength(2));
    expect(cookie("kl_vid")).toBeDefined();
    expect(cookie("kl_sid")).toBeDefined();
    expect(cookie("kl_ft")).toBeUndefined();
    const [view, event] = testState.siteEvents as unknown as SentBatch[];
    expect(view!.events[0]).toMatchObject({ type: "pageview", path: "/" });
    expect(view!.utm).toBeUndefined();
    expect(view!.firstTouch).toBeUndefined();
    expect(event!.events[0]).toMatchObject({ type: "event", name: "poll_created" });
    expect(event!.visitorId).toBe(view!.visitorId);
  });

  it("with campaign consent: records first/last touch from UTM tags and sends them", async () => {
    saveConsent({ analytics: true, marketing: true }, "accept_all", "banner");
    window.history.replaceState(null, "", "/pricing?utm_source=LinkedIn&utm_campaign=launch");
    const { trackPageview } = await loadTracker();
    trackPageview("/pricing");
    await waitFor(() => expect(testState.siteEvents).toHaveLength(1));
    const body = testState.siteEvents[0] as unknown as SentBatch;
    expect(body.utm).toMatchObject({ source: "LinkedIn", campaign: "launch" });
    expect(body.firstTouch).toMatchObject({ source: "LinkedIn", campaign: "launch", landingPage: "/pricing" });
    expect(cookie("kl_ft")).toBeDefined();
    expect(cookie("kl_lt")).toBeDefined();
  });

  it("never tracks respondent pages", async () => {
    saveConsent({ analytics: true, marketing: true }, "accept_all", "banner");
    const { trackPageview } = await loadTracker();
    trackPageview("/f/abc");
    await new Promise((r) => setTimeout(r, 20));
    expect(testState.siteEvents).toHaveLength(0);
  });

  it("withdrawing consent deletes the tracking cookies", async () => {
    saveConsent({ analytics: true, marketing: true }, "accept_all", "banner");
    window.history.replaceState(null, "", "/?utm_source=x");
    const { trackPageview, watchConsent } = await loadTracker();
    const stop = watchConsent(() => {});
    trackPageview("/");
    expect(cookie("kl_vid")).toBeDefined();
    expect(cookie("kl_ft")).toBeDefined();

    saveConsent({ analytics: false, marketing: false }, "reject_all", "settings");
    expect(cookie("kl_vid")).toBeUndefined();
    expect(cookie("kl_sid")).toBeUndefined();
    expect(cookie("kl_ft")).toBeUndefined();
    expect(cookie("kl_lt")).toBeUndefined();
    stop();
  });

  it("opting in after navigating still attributes the landing URL", async () => {
    window.history.replaceState(null, "", "/pricing?utm_source=newsletter&utm_campaign=oct");
    const { watchConsent, trackPageview } = await loadTracker();
    const stop = watchConsent(() => trackPageview(window.location.pathname));
    window.history.replaceState(null, "", "/features"); // SPA navigation drops the query
    saveConsent({ analytics: true, marketing: true }, "accept_all", "banner");
    await waitFor(() => expect(testState.siteEvents).toHaveLength(1));
    const body = testState.siteEvents[0] as unknown as SentBatch;
    expect(body.firstTouch).toMatchObject({ source: "newsletter", campaign: "oct", landingPage: "/pricing" });
    stop();
  });

  it("campaign consent without analytics stores nothing", async () => {
    saveConsent({ analytics: false, marketing: true }, "custom", "banner");
    window.history.replaceState(null, "", "/?utm_source=x");
    const { trackPageview } = await loadTracker();
    trackPageview("/");
    expect(cookie("kl_ft")).toBeUndefined();
    expect(cookie("kl_lt")).toBeUndefined();
  });

  it("counts the current page only when analytics is newly granted, not on every re-save", async () => {
    const { watchConsent } = await loadTracker();
    const onGranted = vi.fn();
    const stop = watchConsent(onGranted);
    saveConsent({ analytics: true, marketing: false }, "custom", "banner");
    saveConsent({ analytics: true, marketing: true }, "accept_all", "settings");
    expect(onGranted).toHaveBeenCalledTimes(1);
    saveConsent({ analytics: false, marketing: false }, "reject_all", "settings");
    saveConsent({ analytics: true, marketing: false }, "custom", "settings");
    expect(onGranted).toHaveBeenCalledTimes(2);
    stop();
  });
});
