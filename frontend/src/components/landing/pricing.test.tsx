import { describe, it, expect, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pricing } from "./pricing";
import { readUpgradeIntent } from "@/lib/upgrade-intent";
import { renderAtRoute } from "@/test/utils";
import { useAuthStore } from "@/store/use-auth-store";
import type { User } from "@/types";

// jsdom lacks IntersectionObserver, which framer-motion's whileInView needs.
globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
} as unknown as typeof IntersectionObserver;

const renderIt = () => renderAtRoute(<Pricing />, { path: "/", route: "/" });

afterEach(() => useAuthStore.getState().clearAuth());

describe("Landing pricing", () => {
  it("shows the three plans in INR and sends visitors to sign up", async () => {
    renderIt();
    const plus = await screen.findByLabelText("Plus plan");
    expect(within(plus).getByText("₹299")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Free plan")).getByRole("link", { name: /start free/i })).toHaveAttribute("href", "/auth/register");
    expect(within(plus).getByRole("button", { name: /get plus/i })).toBeInTheDocument();
  });

  it("sends signed-in users to their plan page with the choice remembered", async () => {
    useAuthStore.getState().setUser({ _id: "u1", name: "Asha", email: "a@x.dev" } as User);
    renderIt();
    const pro = await screen.findByLabelText("Pro plan");
    await userEvent.click(within(pro).getByRole("button", { name: /get pro/i }));
    expect(await screen.findByText("navigated-away")).toBeInTheDocument();
    expect(readUpgradeIntent()).toEqual({ plan: "pro", period: "monthly" });
  });
});
