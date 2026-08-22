import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ChatPage } from "./chat";
import { renderWithClient } from "@/test/utils";
import { server } from "@/test/msw/server";
import { testState } from "@/test/msw/handlers";

const API = "http://localhost:3030/api";

describe("ChatPage (dashboard assistant)", () => {
  it("shows a created share-link card after the AI creates a poll", async () => {
    testState.ai = {
      reply: "Done! Your poll is ready.",
      actions: [
        {
          kind: "created",
          entity: "poll",
          id: "p1",
          shareToken: "tok",
          url: "http://localhost:5173/p/tok",
          title: "Feedback Poll",
        },
      ],
      conversationId: "conv1",
      messages: [],
    };
    renderWithClient(<ChatPage />);

    await userEvent.type(screen.getByPlaceholderText(/ask ai to create/i), "make a feedback poll{Enter}");

    expect(await screen.findByText("Done! Your poll is ready.")).toBeInTheDocument();
    expect(screen.getByText("Feedback Poll")).toBeInTheDocument();
    // share link surfaced with a copy control
    expect(screen.getByDisplayValue("http://localhost:5173/p/tok")).toBeInTheDocument();
    // the user's message is echoed
    expect(screen.getByText("make a feedback poll")).toBeInTheDocument();
    expect(testState.aiLastBody).toMatchObject({ surface: "dashboard", message: "make a feedback poll" });
  });

  it("renders assistant markdown (bold + lists) instead of raw text", async () => {
    testState.ai = {
      reply: "Let's build a **quiz**. A few things:\n\n1. Difficulty?\n2. Question types:\n   - Multiple-choice\n   - True/False",
      actions: [],
      conversationId: "conv1",
      messages: [],
    };
    renderWithClient(<ChatPage />);
    await userEvent.type(screen.getByPlaceholderText(/ask ai to create/i), "make a quiz{Enter}");

    // "**quiz**" must become a <strong>, not literal asterisks.
    const bold = await screen.findByText("quiz");
    expect(bold.tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*quiz\*\*/)).not.toBeInTheDocument();
    // markdown lists render as real list items
    expect(screen.getByText("Multiple-choice").closest("li")).toBeInTheDocument();
    expect(document.querySelector("ol")).toBeInTheDocument();
  });

  it("renders suggestion prompts when there is no active chat", () => {
    renderWithClient(<ChatPage />);
    expect(screen.getByText(/create with ai/i)).toBeInTheDocument();
    expect(screen.getByText(/customer feedback poll/i)).toBeInTheDocument();
  });

  it("asks for confirmation before deleting a chat", async () => {
    let deletedId: string | null = null;
    server.use(
      http.get(`${API}/ai/conversations`, () =>
        HttpResponse.json({ data: [{ _id: "c1", title: "My quiz chat", updatedAt: "2026-08-16" }] })
      ),
      http.delete(`${API}/ai/conversations/:id`, ({ params }) => {
        deletedId = String(params.id);
        return HttpResponse.json({ data: { deleted: true } });
      })
    );
    renderWithClient(<ChatPage />);

    await screen.findByText("My quiz chat");
    await userEvent.click(screen.getByLabelText("Delete chat"));

    // Modal appears; nothing deleted yet.
    expect(await screen.findByText("Delete chat?")).toBeInTheDocument();
    expect(deletedId).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => expect(deletedId).toBe("c1"));
  });

  it("can hide the history sidebar", async () => {
    renderWithClient(<ChatPage />);
    expect(screen.getByText("Chats")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Close history"));
    expect(screen.queryByText("Chats")).not.toBeInTheDocument();
  });
});
