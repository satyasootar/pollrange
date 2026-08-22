import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuilderChatPanel } from "./builder-chat-panel";
import { renderWithClient } from "@/test/utils";
import { testState } from "@/test/msw/handlers";

describe("BuilderChatPanel", () => {
  it("sends the message + builder state and forwards actions to the builder", async () => {
    testState.ai = {
      reply: "Added a name question!",
      actions: [{ kind: "add_poll_question", question: { text: "Your name?", type: "open_ended" } }],
      conversationId: "conv1",
      messages: [],
    };
    const onActions = vi.fn();
    renderWithClient(
      <BuilderChatPanel
        surface="poll-builder"
        getBuilderState={() => ({ title: "My Poll", questions: [] })}
        onActions={onActions}
      />
    );

    await userEvent.type(screen.getByPlaceholderText(/tell the ai what to add/i), "add a name question{Enter}");

    expect(await screen.findByText("Added a name question!")).toBeInTheDocument();
    await waitFor(() => expect(onActions).toHaveBeenCalledTimes(1));
    expect(onActions).toHaveBeenCalledWith([
      { kind: "add_poll_question", question: { text: "Your name?", type: "open_ended" } },
    ]);
    // the builder summary was sent to the backend
    expect(testState.aiLastBody).toMatchObject({ surface: "poll-builder", builderState: { title: "My Poll" } });
  });

  it("rolls back the optimistic user message on error", async () => {
    const { server } = await import("@/test/msw/server");
    const { http, HttpResponse } = await import("msw");
    server.use(http.post("http://localhost:3030/api/ai/chat", () => new HttpResponse(null, { status: 500 })));
    const onActions = vi.fn();
    renderWithClient(
      <BuilderChatPanel surface="form-builder" getBuilderState={() => ({ questions: [] })} onActions={onActions} />
    );
    await userEvent.type(screen.getByPlaceholderText(/tell the ai what to add/i), "add something{Enter}");
    await waitFor(() => expect(onActions).not.toHaveBeenCalled());
    // optimistic message removed → back to the empty-state suggestions
    await waitFor(() => expect(screen.queryByText("add something")).not.toBeInTheDocument());
  });
});
