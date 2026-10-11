import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { BillingPage } from "./billing";
import { UsageBanner } from "@/components/billing/usage-banner";
import { StepFormSettings } from "@/components/form-builder/step-form-settings";
import { StepPlan } from "@/components/onboarding/step-plan";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { renderAtRoute } from "@/test/utils";
import { testState } from "@/test/msw/handlers";
import { makePlanState } from "@/test/msw/factories";
import { toastApiError } from "@/lib/utils";
import { nearLimits } from "@/lib/plan-format";
import { Pricing } from "@/components/landing/pricing";
import { UpgradeIntentNote } from "@/components/billing/upgrade-intent-note";
import { UpgradeIntentResumer } from "@/components/billing/upgrade-intent-resumer";
import { readUpgradeIntent, saveUpgradeIntent } from "@/lib/upgrade-intent";

const at = (ui: React.ReactElement) => renderAtRoute(ui, { path: "/x", route: "/x" });

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("BillingPage", () => {
  it("shows current plan, usage against limits, and INR plan cards with upgrade requests", async () => {
    at(<BillingPage />);
    expect(await screen.findByText("Free forever")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Responses this month" })).toHaveAttribute("aria-valuenow", "12");

    const plus = await screen.findByLabelText("Plus plan");
    expect(within(plus).getByText("₹299")).toBeInTheDocument();
    expect(within(plus).getByText("10,000 responses / month")).toBeInTheDocument();
    expect(within(plus).getByRole("button", { name: /request plus/i })).toBeInTheDocument();
    expect(within(screen.getByLabelText("Free plan")).getByText("Your plan")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /yearly/i }));
    expect(within(plus).getByText("₹2,990")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Pro plan")).getByText("Unlimited live forms & polls")).toBeInTheDocument();
  });

  it("explains grace when a quota is exceeded and marks paid plans below the current one as included", async () => {
    testState.planState = makePlanState({
      plan: "pro", label: "Pro", assignedPlan: "pro",
      usage: { responses: { used: 105_000, limit: 100_000 }, liveItems: { used: 1, limit: null }, uploads: { used: 0, limit: 20000 }, aiMessages: { used: 0, limit: 2000 } },
    });
    at(<BillingPage />);
    expect(await screen.findByText(/15,000 more allowed this month/)).toBeInTheDocument();
    expect(within(await screen.findByLabelText("Plus plan")).getByText("Included in your plan")).toBeInTheDocument();
  });
});

describe("toastApiError", () => {
  const err = (errors: object[]) => ({ response: { status: 402, data: { message: "Limit reached.", errors } } });

  it("offers 'See plans' for a creator's plan limit", () => {
    const spy = vi.spyOn(toast, "error");
    toastApiError(err([{ code: "PLAN_LIMIT", plan: "free", metric: "liveItems" }]));
    expect(spy).toHaveBeenCalledWith("Limit reached.", expect.objectContaining({ action: expect.objectContaining({ label: "See plans" }) }));
  });

  it("shows respondent-facing 402s (no plan details) as a plain error", () => {
    const spy = vi.spyOn(toast, "error");
    toastApiError(err([{ code: "PLAN_LIMIT", metric: "responses" }]));
    expect(spy).toHaveBeenCalledWith("Limit reached.");
  });
});

describe("UsageBanner", () => {
  it("stays hidden under 80%", async () => {
    at(<UsageBanner />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("warns at 80%+, tells the creator about grace at 100%, and can be dismissed", async () => {
    testState.planState = makePlanState({ usage: { ...makePlanState().usage, responses: { used: 1000, limit: 1000 } } });
    at(<UsageBanner />);
    expect(await screen.findByText(/keep accepting 200 more/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("ranks the most-used quota first", () => {
    const s = makePlanState({ usage: { responses: { used: 850, limit: 1000 }, liveItems: { used: 10, limit: 10 }, uploads: { used: 0, limit: 100 }, aiMessages: { used: 0, limit: 30 } } });
    expect(nearLimits(s).map((n) => n.metric)).toEqual(["liveItems", "responses"]);
  });
});

describe("plan-gated UI", () => {
  it("locks the custom slug on Free and unlocks it on Plus", async () => {
    useFormBuilderStore.getState().reset();
    const { unmount } = at(<StepFormSettings />);
    expect(await screen.findByText(/custom links are part of plus/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/custom form slug/i)).toBeDisabled();
    unmount();

    testState.planState = makePlanState({ plan: "plus", label: "Plus", features: { customSlug: true, branding: true } });
    at(<StepFormSettings />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByLabelText(/custom form slug/i)).toBeEnabled();
  });

  it("onboarding renders server plans in INR and records the pick", async () => {
    at(<StepPlan />);
    const plus = await screen.findByLabelText("Plus plan");
    expect(within(plus).getByText("₹299")).toBeInTheDocument();
    await userEvent.click(within(plus).getByRole("button", { name: /i'm interested/i }));
    expect(useOnboardingStore.getState().form.plan).toBe("plus");
  });
});

describe("upgrade requests", () => {
  it("requesting from the billing page files it, shows it pending, and can be cancelled", async () => {
    at(<BillingPage />);
    await userEvent.click(screen.getByRole("button", { name: /yearly/i }));
    const pro = await screen.findByLabelText("Pro plan");
    await userEvent.click(within(pro).getByRole("button", { name: /request pro/i }));

    expect(await screen.findByText(/waiting for approval/i)).toBeInTheDocument();
    expect(testState.planRequestBodies).toEqual([{ plan: "pro", period: "yearly" }]);
    expect(await within(pro).findByText("Requested")).toBeInTheDocument();
    // Another paid plan now offers to switch the open request.
    expect(within(screen.getByLabelText("Plus plan")).getByRole("button", { name: /change request to plus/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /cancel request/i }));
    await waitFor(() => expect(screen.queryByText(/waiting for approval/i)).not.toBeInTheDocument());
  });

  it("shows why the last request was rejected", async () => {
    testState.planRequests = [
      { id: "r9", plan: "plus", period: "monthly", note: null, status: "rejected", adminNote: "Payment not received", createdAt: "2026-10-01T00:00:00Z", decidedAt: "2026-10-02T00:00:00Z" },
    ];
    at(<BillingPage />);
    expect(await screen.findByText(/wasn't approved/i)).toBeInTheDocument();
    expect(screen.getByText("“Payment not received”")).toBeInTheDocument();
  });

  it("visitor flow: Get Plus on pricing → sign-up note → onboarding pre-selected → request filed in the app", async () => {
    // 1. Pricing (logged out) remembers the choice and heads to sign-up.
    globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } as unknown as typeof IntersectionObserver;
    const pricing = renderAtRoute(<Pricing />, { path: "/", route: "/" });
    await userEvent.click(await screen.findByRole("button", { name: /yearly/i }));
    await userEvent.click(within(await screen.findByLabelText("Plus plan")).getByRole("button", { name: /get plus/i }));
    expect(await screen.findByText("navigated-away")).toBeInTheDocument();
    expect(readUpgradeIntent()).toEqual({ plan: "plus", period: "yearly" });
    pricing.unmount();

    // 2. The sign-up page tells them what happens next.
    const note = at(<UpgradeIntentNote action="create your account" />);
    expect(screen.getByText("Getting Plus (yearly)")).toBeInTheDocument();
    note.unmount();

    // 3. Onboarding pre-selects Plus.
    useOnboardingStore.getState().setField("plan", undefined as never);
    const onboarding = at(<StepPlan />);
    await screen.findByLabelText("Plus plan");
    await waitFor(() => expect(useOnboardingStore.getState().form.plan).toBe("plus"));
    onboarding.unmount();

    // 4. Inside the app, the request is filed once and the intent is cleared.
    renderAtRoute(<UpgradeIntentResumer />, { path: "/dashboard", route: "/dashboard" });
    await waitFor(() => expect(testState.planRequestBodies).toEqual([{ plan: "plus", period: "yearly" }]));
    expect(readUpgradeIntent()).toBeNull();
    expect(await screen.findByText("navigated-away")).toBeInTheDocument(); // → /dashboard/billing
  });

  it("does nothing in the app when there's no saved intent", async () => {
    renderAtRoute(<UpgradeIntentResumer />, { path: "/dashboard", route: "/dashboard" });
    await new Promise((r) => setTimeout(r, 50));
    expect(testState.planRequestBodies).toEqual([]);
  });

  it("drops stale or tampered intents", () => {
    localStorage.setItem("kollects_upgrade_intent", JSON.stringify({ plan: "plus", period: "monthly", at: Date.now() - 2 * 86_400_000 }));
    expect(readUpgradeIntent()).toBeNull();
    localStorage.setItem("kollects_upgrade_intent", JSON.stringify({ plan: "enterprise", period: "monthly", at: Date.now() }));
    expect(readUpgradeIntent()).toBeNull();
    saveUpgradeIntent({ plan: "pro", period: "monthly" });
    expect(readUpgradeIntent()).toEqual({ plan: "pro", period: "monthly" });
  });
});

