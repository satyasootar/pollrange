import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceiptStatus, ReceiptSummary } from "./receipt-status";

const at = "2026-10-13T10:00:00.000Z";

describe("ReceiptStatus", () => {
  it("says so when there is no address to send to", () => {
    render(<ReceiptStatus receipt={null} email={null} sending={false} onSend={() => {}} />);
    expect(screen.getByText("No email")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers to send when a copy never went out", async () => {
    const onSend = vi.fn();
    render(<ReceiptStatus receipt={null} email="bob@test.local" sending={false} onSend={onSend} />);
    expect(screen.getByText("Not sent")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send copy" }));
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("shows failures with the reason and sent copies with a resend option", () => {
    const { rerender } = render(
      <ReceiptStatus receipt={{ status: "failed", to: "bob@test.local", at, trigger: "auto", error: "domain not verified" }} email="bob@test.local" sending={false} onSend={() => {}} />
    );
    expect(screen.getByText("Email failed")).toBeInTheDocument();
    expect(screen.getByText(/domain not verified/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send copy" })).toBeInTheDocument();

    rerender(<ReceiptStatus receipt={{ status: "sent", to: "bob@test.local", at, trigger: "manual" }} email="bob@test.local" sending={false} onSend={() => {}} />);
    expect(screen.getByText("Copy sent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
  });

  it("disables the button while sending", () => {
    render(<ReceiptStatus receipt={null} email="bob@test.local" sending onSend={() => {}} />);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });

  it("opens the full attempt history, newest first, with who triggered each", async () => {
    const history = [
      { status: "failed" as const, to: "bob@test.local", at, trigger: "auto" as const, error: "domain not verified" },
      { status: "sent" as const, to: "bob@test.local", at: "2026-10-13T11:00:00.000Z", trigger: "manual" as const },
    ];
    render(<ReceiptStatus receipt={history[1]!} history={history} email="bob@test.local" sending={false} onSend={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Show email history/ }));
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Copy sent");
    expect(items[0]).toHaveTextContent("sent by you");
    expect(items[1]).toHaveTextContent("Email failed");
    expect(items[1]).toHaveTextContent("sent automatically on submit");
    expect(items[1]).toHaveTextContent("domain not verified");
  });
});

describe("ReceiptSummary", () => {
  it("shows counts and toggles a filter", async () => {
    const onFilter = vi.fn();
    const { rerender } = render(<ReceiptSummary summary={{ sent: 3, failed: 1, unsent: 2 }} filter={undefined} onFilter={onFilter} />);
    expect(screen.getByRole("button", { name: "3 sent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 not sent" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "1 failed" }));
    expect(onFilter).toHaveBeenLastCalledWith("failed");

    rerender(<ReceiptSummary summary={{ sent: 3, failed: 1, unsent: 2 }} filter="failed" onFilter={onFilter} />);
    expect(screen.getByRole("button", { name: "1 failed" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "1 failed" }));
    expect(onFilter).toHaveBeenLastCalledWith(undefined);
  });
});
