import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceiptStatus } from "./receipt-status";

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
      <ReceiptStatus receipt={{ status: "failed", to: "bob@test.local", at, error: "domain not verified" }} email="bob@test.local" sending={false} onSend={() => {}} />
    );
    expect(screen.getByText("Email failed")).toBeInTheDocument();
    expect(screen.getByText(/domain not verified/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send copy" })).toBeInTheDocument();

    rerender(<ReceiptStatus receipt={{ status: "sent", to: "bob@test.local", at }} email="bob@test.local" sending={false} onSend={() => {}} />);
    expect(screen.getByText("Copy sent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
  });

  it("disables the button while sending", () => {
    render(<ReceiptStatus receipt={null} email="bob@test.local" sending onSend={() => {}} />);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });
});
