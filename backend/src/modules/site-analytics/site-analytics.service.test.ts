import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMany = vi.fn();
const consentCreate = vi.fn();
const userUpdate = vi.fn();
vi.mock("./site-analytics.model.js", () => ({ TrackEvent: { insertMany }, ConsentRecord: { create: consentCreate } }));
vi.mock("../user/user.model.js", () => ({ User: { updateOne: userUpdate } }));
vi.mock("../../config/config.js", () => ({ default: { CLIENT_URL: "https://kollects.app", JWT_SECRET: "s" } }));

const { recordEvents, recordConsent, referrerHost } = await import("./site-analytics.service.js");
const { parseUserAgent } = await import("../../utils/user-agent.js");
const { trackSchema } = await import("./site-analytics.validation.js");

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const meta = { ip: "1.2.3.4", userAgent: CHROME };
const base = { visitorId: "visitor-0001", sessionId: "session-0001" };

describe("site analytics ingest", () => {
  beforeEach(() => [insertMany, consentCreate, userUpdate].forEach((m) => m.mockReset()));

  it("stores path only, referrer host only, and derives the visit source", async () => {
    await recordEvents(
      { ...base, events: [{ type: "pageview", path: "/auth/reset-password?token=secret#x", referrer: "https://www.google.com/search?q=polls" }] },
      meta
    );
    const [doc] = insertMany.mock.calls[0]![0];
    expect(doc).toMatchObject({ path: "/auth/reset-password", referrer: "google.com", source: "google.com", browser: "Chrome", os: "Windows", device: "desktop" });
  });

  it("prefers utm_source, and treats our own site as direct", async () => {
    await recordEvents({ ...base, utm: { source: "Newsletter", campaign: "oct" }, events: [{ type: "pageview", path: "/" }] }, meta);
    expect(insertMany.mock.calls[0]![0][0]).toMatchObject({ source: "newsletter", utm: { source: "Newsletter", campaign: "oct" } });
    expect(referrerHost("https://kollects.app/pricing")).toBeUndefined();
    expect(referrerHost("not a url")).toBeUndefined();
  });

  it("ignores bots", async () => {
    expect(await recordEvents({ ...base, events: [{ type: "pageview", path: "/" }] }, { ...meta, userAgent: "Googlebot/2.1" })).toEqual({ stored: 0 });
    expect(insertMany).not.toHaveBeenCalled();
  });

  it("records a signed-in user's first-touch attribution only once", async () => {
    await recordEvents(
      { ...base, firstTouch: { source: "LinkedIn", campaign: "launch", landingPage: "/", at: "2026-10-01T00:00:00.000Z" }, events: [{ type: "event", name: "signup", path: "/onboarding" }] },
      { ...meta, userId: "u1" }
    );
    const [filter, update] = userUpdate.mock.calls[0]!;
    expect(filter).toEqual({ _id: "u1", "acquisition.firstSeenAt": { $exists: false } });
    expect(update.$set.acquisition).toMatchObject({ source: "linkedin", campaign: "launch", visitorId: "visitor-0001" });
  });

  it("keeps rejected choices (false) on the consent record", async () => {
    await recordConsent(
      { consentId: "consent-0001", analytics: false, marketing: false, action: "reject_all", version: 2, source: "banner", page: "/?utm=x" },
      meta
    );
    expect(consentCreate.mock.calls[0]![0]).toMatchObject({ analytics: false, marketing: false, action: "reject_all", page: "/" });
    expect(consentCreate.mock.calls[0]![0].ipHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects malformed payloads", () => {
    expect(trackSchema.safeParse({ ...base, events: [] }).success).toBe(false);
    expect(trackSchema.safeParse({ ...base, events: [{ type: "event", name: "Bad Name!", path: "/" }] }).success).toBe(false);
    expect(trackSchema.safeParse({ visitorId: "x", sessionId: "session-0001", events: [{ type: "pageview", path: "/" }] }).success).toBe(false);
  });

  it("parses common user agents", () => {
    expect(parseUserAgent("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36")).toMatchObject({ os: "Android", device: "mobile", browser: "Chrome" });
    expect(parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toMatchObject({ os: "iOS", browser: "Safari" });
    expect(parseUserAgent(`${CHROME} Edg/128.0`).browser).toBe("Edge");
  });
});
