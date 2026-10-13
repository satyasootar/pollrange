import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { PlanChip } from "./plan-chip";
import { renderAtRoute } from "@/test/utils";
import { testState } from "@/test/msw/handlers";
import { makePlanState } from "@/test/msw/factories";

const renderIt = () => renderAtRoute(<PlanChip />, { path: "/", route: "/" });

describe("PlanChip", () => {
  it("shows the current plan and links to Plan & usage", async () => {
    renderIt();
    const chip = await screen.findByRole("link", { name: /free plan/i });
    expect(chip).toHaveTextContent("Free");
    expect(chip).toHaveAttribute("href", "/dashboard/billing");
  });

  it("mentions the end date for time-boxed paid plans", async () => {
    testState.planState = makePlanState({ plan: "pro", label: "Pro", assignedPlan: "pro", expiresAt: "2027-01-31T00:00:00Z" });
    renderIt();
    const chip = await screen.findByRole("link", { name: /pro plan · active until/i });
    expect(chip).toHaveTextContent("Pro");
  });
});
