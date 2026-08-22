import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatTile, type Stat } from "./stat-tile";

const Icon = vi.fn(() => <svg data-testid="icon" />);

function Harness({ makeStat }: { makeStat: (n: number) => Stat }) {
  const [n, setN] = useState(0);
  return (
    <div>
      <StatTile stat={makeStat(n)} />
      <button onClick={() => setN((x) => x + 1)}>bump</button>
    </div>
  );
}

describe("StatTile", () => {
  beforeEach(() => Icon.mockClear());

  it("renders the label, value, and icon", () => {
    render(<StatTile stat={{ label: "Total Polls", value: 5, icon: Icon, color: "text-primary" }} />);
    expect(screen.getByText("Total Polls")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(Icon).toHaveBeenCalledTimes(1);
  });

  it("bails out of re-rendering when a new stat object has identical fields", async () => {
    // Parent re-renders each click and builds a brand-new stat object — but its
    // fields (label/value/icon/color) never change, so the tile must not re-render.
    render(
      <Harness makeStat={() => ({ label: "Total Responses", value: 42, icon: Icon, color: "text-emerald-500" })} />
    );
    expect(Icon).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText("bump"));
    await userEvent.click(screen.getByText("bump"));

    expect(Icon).toHaveBeenCalledTimes(1);
  });

  it("re-renders only when a field actually changes (e.g. the value)", async () => {
    render(<Harness makeStat={(n) => ({ label: "Total Responses", value: n, icon: Icon, color: "text-emerald-500" })} />);
    expect(Icon).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText("bump"));

    expect(Icon).toHaveBeenCalledTimes(2);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("re-renders when the icon (logo) differs, even if the label/value match", () => {
    const OtherIcon = vi.fn(() => <svg data-testid="other-icon" />);
    const { rerender } = render(
      <StatTile stat={{ label: "Total", value: 1, icon: Icon, color: "text-primary" }} />
    );
    rerender(<StatTile stat={{ label: "Total", value: 1, icon: OtherIcon, color: "text-primary" }} />);
    expect(screen.getByTestId("other-icon")).toBeInTheDocument();
  });
});
