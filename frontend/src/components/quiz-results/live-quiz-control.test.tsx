import { describe, it, expect, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LiveQuizControl } from "./live-quiz-control";
import { renderWithClient } from "@/test/utils";
import { testState } from "@/test/msw/handlers";
import { makeForm } from "@/test/msw/factories";

// A fake socket: the test pushes server events (lobby count) through `sock.emitFromServer`.
const sock = vi.hoisted(() => {
  const handlers = new Map<string, Set<(data: unknown) => void>>();
  return { handlers, emitFromServer: (event: string, data: unknown) => handlers.get(event)?.forEach((h) => h(data)) };
});
vi.mock("@/lib/socket", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/socket")>();
  return {
    ...actual,
    getSocket: () => ({
      connected: true,
      emit: () => {},
      on: (event: string, h: (data: unknown) => void) => {
        if (!sock.handlers.has(event)) sock.handlers.set(event, new Set());
        sock.handlers.get(event)!.add(h);
      },
      off: (event: string, h: (data: unknown) => void) => sock.handlers.get(event)?.delete(h),
    }),
  };
});

const liveForm = (o: Parameters<typeof makeForm>[0] = {}) =>
  makeForm({ _id: "f1", isQuiz: true, quizTimer: { mode: "live", durationMinutes: 30 }, ...o });

describe("LiveQuizControl", () => {
  it("shows the lobby and starts the quiz for everyone after confirming", async () => {
    renderWithClient(<LiveQuizControl form={liveForm()} responses={0} />);
    act(() => sock.emitFromServer("quiz-lobby-count", { formId: "f1", count: 12 }));
    expect(await screen.findByText("12")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /start quiz for everyone/i }));
    expect(await screen.findByText(/everyone gets 30 minutes/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /start now/i }));
    await waitFor(() => expect(testState.liveActions).toEqual(["start:30"]));
  });

  it("while running: shows the shared countdown, adds time and ends early", async () => {
    const now = Date.now();
    renderWithClient(
      <LiveQuizControl
        form={liveForm({ liveStartedAt: new Date(now - 60_000).toISOString(), expiresAt: new Date(now + 10 * 60_000).toISOString() })}
        responses={4}
      />
    );
    expect(await screen.findByRole("timer")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /5 min/i }));
    await userEvent.click(screen.getByRole("button", { name: /end now/i }));
    await userEvent.click(await screen.findByRole("button", { name: /end quiz/i }));
    await waitFor(() => expect(testState.liveActions).toEqual(["extend:5", "end"]));
  });

  it("shows the ended summary once the quiz is over", () => {
    renderWithClient(<LiveQuizControl form={liveForm({ status: "closed", liveStartedAt: new Date().toISOString() })} responses={7} />);
    expect(screen.getByText(/7 people submitted/i)).toBeInTheDocument();
  });
});
