import { describe, it, expect, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CookieConsent } from "./cookie-consent";
import { CONSENT_EVENT, openCookieSettings, readConsent, saveConsent } from "@/lib/consent";
import { testState } from "@/test/msw/handlers";

const renderAt = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CookieConsent />
    </MemoryRouter>
  );

const banner = () => screen.queryByRole("region", { name: "Cookie consent" });
const clearCookies = () =>
  document.cookie.split("; ").forEach((c) => (document.cookie = `${c.split("=")[0]}=; Max-Age=0; Path=/`));

describe("CookieConsent", () => {
  beforeEach(clearCookies);

  it("asks first-time visitors; Reject all saves everything off and logs the decision", async () => {
    const events: unknown[] = [];
    window.addEventListener(CONSENT_EVENT, (e) => events.push((e as CustomEvent).detail), { once: true });
    window.history.replaceState(null, "", "/pricing"); // the logged page comes from the real URL
    renderAt("/pricing");
    expect(banner()).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reject all" }));
    expect(banner()).not.toBeInTheDocument();
    expect(readConsent()).toMatchObject({ analytics: false, marketing: false, v: 2 });
    expect(events).toHaveLength(1);
    await waitFor(() => expect(testState.siteConsents).toHaveLength(1));
    expect(testState.siteConsents[0]).toMatchObject({ analytics: false, marketing: false, action: "reject_all", source: "banner", page: "/pricing", version: 2 });
    expect(testState.siteConsents[0]!.consentId).toBe(readConsent()!.id);
  });

  it("Accept all turns every optional category on", async () => {
    renderAt();
    await userEvent.click(screen.getByRole("button", { name: "Accept all" }));
    expect(readConsent()).toMatchObject({ analytics: true, marketing: true });
    await waitFor(() => expect(testState.siteConsents[0]).toMatchObject({ action: "accept_all" }));
  });

  it("Customize starts with optional categories off and saves a custom mix", async () => {
    renderAt();
    await userEvent.click(screen.getByRole("button", { name: "Customize" }));
    const analytics = screen.getByRole("switch", { name: "Analytics" });
    const marketing = screen.getByRole("switch", { name: "Campaign attribution" });
    expect(analytics).not.toBeChecked();
    expect(marketing).not.toBeChecked();
    await userEvent.click(analytics);
    await userEvent.click(screen.getByRole("button", { name: "Save choices" }));
    expect(readConsent()).toMatchObject({ analytics: true, marketing: false });
    await waitFor(() => expect(testState.siteConsents[0]).toMatchObject({ action: "custom" }));
  });

  it("keeps the same consent id when a visitor changes their mind from Cookie settings", async () => {
    const first = saveConsent({ analytics: true, marketing: true }, "accept_all", "banner");
    renderAt();
    expect(banner()).not.toBeInTheDocument();
    act(() => openCookieSettings());
    expect(await screen.findByRole("dialog", { name: "Cookie preferences" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Analytics" })).toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: "Reject all" }));
    expect(readConsent()).toMatchObject({ id: first.id, analytics: false });
    await waitFor(() => expect(testState.siteConsents.at(-1)).toMatchObject({ source: "settings", action: "reject_all" }));
  });

  it("is not shown on respondent poll and form pages", () => {
    renderAt("/f/some-form");
    expect(banner()).not.toBeInTheDocument();
  });
});
