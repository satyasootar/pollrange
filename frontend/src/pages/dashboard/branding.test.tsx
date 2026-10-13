import { describe, it, expect, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BrandingPage } from "./branding";
import { PublicFormPage } from "@/pages/public/form";
import { renderAtRoute } from "@/test/utils";
import { server } from "@/test/msw/server";
import { testState } from "@/test/msw/handlers";
import { makePlanState, makePublicForm } from "@/test/msw/factories";
import { useAuthStore } from "@/store/use-auth-store";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { StepFormSettings } from "@/components/form-builder/step-form-settings";
import { toFormPayload } from "@/api/forms.api";
import { brandVars, contrastRatio, contrastText } from "@/lib/brand";
import type { PublicBrand, User } from "@/types";

const API = "http://localhost:3030/api";
const plus = () => (testState.planState = makePlanState({ plan: "plus", label: "Plus", features: { customSlug: true, branding: true } }));

const brand: PublicBrand = {
  companyName: "Chai Co",
  logoUrl: "https://cdn.test/logo.png",
  accentColor: "#123456",
  font: "default",
  radius: "soft",
  background: "plain",
  website: "https://chai.test",
  supportEmail: "hi@chai.test",
  redirectUrl: "",
  shareImageUrl: "",
};

afterEach(() => useAuthStore.setState({ user: null }));

describe("brand colour helpers", () => {
  it("picks readable button text and measures contrast", () => {
    expect(contrastText("#000000")).toBe("#ffffff");
    expect(contrastText("#fde047")).toBe("#000000");
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("only overrides the accent when it's a valid hex and tints on request", () => {
    expect(brandVars({ accentColor: "nope", font: "default", radius: "sharp", background: "tint" })).toEqual({ "--brand-radius": "0px" });
    const v = brandVars({ accentColor: "#123456", font: "default", radius: "round", background: "tint" });
    expect(v["--primary"]).toBe("#123456");
    expect(v["--primary-foreground"]).toBe("#ffffff");
    expect(v["--background"]).toContain("color-mix");
    expect(v["--brand-radius"]).toBe("1rem");
  });
});

describe("BrandingPage", () => {
  it("lets Free users try the kit but asks them to upgrade to save", async () => {
    renderAtRoute(<BrandingPage />, { path: "/b", route: "/b" });
    expect(await screen.findByRole("link", { name: /upgrade to save/i })).toHaveAttribute("href", "/dashboard/billing");
    await userEvent.type(screen.getByLabelText("Company name"), "Chai Co");
    // The live preview reflects edits even before saving.
    expect(screen.getAllByText("Chai Co").length).toBeGreaterThan(0);
  });

  it("saves the kit on Plus", async () => {
    plus();
    useAuthStore.setState({ user: { _id: "u1", name: "Asha", email: "a@x.dev" } as User });
    let body: { branding?: Record<string, unknown> } | null = null;
    server.use(
      http.patch(`${API}/auth/me`, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json({ data: { user: { _id: "u1", name: "Asha", email: "a@x.dev", branding: body?.branding } } });
      })
    );
    renderAtRoute(<BrandingPage />, { path: "/b", route: "/b" });
    const save = await screen.findByRole("button", { name: /^save$/i });
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Accent #059669" }));
    await userEvent.click(screen.getByRole("radio", { name: "Round" }));
    await userEvent.click(save);
    await waitFor(() => expect(body?.branding).toMatchObject({ accentColor: "#059669", radius: "round" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled());
  });
});

describe("Branded public form", () => {
  it("shows the logo and contact line, themes the document, and restores it on leave", async () => {
    testState.publicForm = makePublicForm({ title: "Order form", brand, showPoweredBy: false });
    const { unmount } = renderAtRoute(<PublicFormPage />, { path: "/f/:shareToken", route: "/f/tok123" });
    expect(await screen.findByAltText("Chai Co")).toHaveAttribute("src", brand.logoUrl);
    expect(screen.getByText("hi@chai.test")).toBeInTheDocument();
    expect(screen.queryByText(/made with/i)).not.toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#123456"));
    expect(document.documentElement.hasAttribute("data-brand-radius")).toBe(true);
    expect(document.title).toBe("Order form · Chai Co");

    unmount();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("");
    expect(document.documentElement.hasAttribute("data-brand-radius")).toBe(false);
  });

  it("offers the redirect after submit and lets the respondent stay", async () => {
    testState.publicForm = makePublicForm({ brand: { ...brand, redirectUrl: "https://chai.test/thanks" } });
    renderAtRoute(<PublicFormPage />, { path: "/f/:shareToken", route: "/f/tok123" });
    await userEvent.type(await screen.findByPlaceholderText("Your answer"), "Ada");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/redirecting in 5s/i);
    expect(screen.getByRole("link", { name: /continue to chai co/i })).toHaveAttribute("href", "https://chai.test/thanks");
    await userEvent.click(screen.getByRole("button", { name: /stay here/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("looks like Kollects when the brand is null", async () => {
    testState.publicForm = makePublicForm({ brand: null, showPoweredBy: true });
    renderAtRoute(<PublicFormPage />, { path: "/f/:shareToken", route: "/f/tok123" });
    expect(await screen.findByText(/made with/i)).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("");
  });
});

describe("Form builder branding card", () => {
  it("toggles the kit per form and locks overrides on Free", async () => {
    useFormBuilderStore.getState().reset();
    renderAtRoute(<StepFormSettings />, { path: "/s", route: "/s" });
    const toggle = await screen.findByRole("switch", { name: /branding/i });
    await waitFor(() => expect(screen.getByLabelText("Accent colour for this form")).toBeDisabled());
    await userEvent.click(toggle);
    expect(useFormBuilderStore.getState().form.branding.useKit).toBe(false);
    expect(toFormPayload(useFormBuilderStore.getState().form).branding).toEqual({ useKit: false });
  });
});
