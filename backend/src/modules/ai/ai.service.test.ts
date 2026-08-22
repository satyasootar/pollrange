import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM client, the create services, and config (avoids network + DB + dotenv).
vi.mock("./ai.client.js", () => ({
  aiClient: { chat: { completions: { create: vi.fn() } } },
  AI_MODEL: "test-model",
  isAiConfigured: () => true,
}));
vi.mock("../poll/poll.service.js", () => ({ createPoll: vi.fn() }));
vi.mock("../form/form.service.js", () => ({ createForm: vi.fn() }));
vi.mock("../../config/config.js", () => ({
  default: { CLIENT_URL: "http://localhost:5173" },
}));

import { aiClient } from "./ai.client.js";
import { createPoll } from "../poll/poll.service.js";
import { createForm } from "../form/form.service.js";
import { runChat } from "./ai.service.js";

const create = aiClient.chat.completions.create as unknown as ReturnType<typeof vi.fn>;

const toolCall = (name: string, args: unknown) => ({
  choices: [
    { message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name, arguments: JSON.stringify(args) } }] } },
  ],
});
const finalText = (content: string) => ({ choices: [{ message: { role: "assistant", content } }] });

beforeEach(() => vi.clearAllMocks());

describe("runChat", () => {
  it("dashboard: create_poll persists via the poll service and returns a share link", async () => {
    create
      .mockResolvedValueOnce(
        toolCall("create_poll", {
          title: "Feedback",
          questions: [{ text: "How was it?", type: "single_choice", options: ["Good", "Bad"] }],
        })
      )
      .mockResolvedValueOnce(finalText("Your poll is ready!"));
    (createPoll as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: "p1", shareToken: "tok123", title: "Feedback" });

    const { reply, actions } = await runChat({ userId: "u1", surface: "dashboard", messages: [{ role: "user", content: "make a feedback poll" }] });

    expect(createPoll).toHaveBeenCalledWith("u1", expect.objectContaining({ title: "Feedback", responseMode: "anonymous" }));
    // options mapped to {text, order}; question got an order index
    expect((createPoll as ReturnType<typeof vi.fn>).mock.calls[0][1].questions[0].options).toEqual([
      { text: "Good", order: 0 },
      { text: "Bad", order: 1 },
    ]);
    expect(actions[0]).toMatchObject({ kind: "created", entity: "poll", url: "http://localhost:5173/p/tok123", title: "Feedback" });
    expect(reply).toMatch(/ready/i);
  });

  it("dashboard: create_form persists and returns a /f/ link", async () => {
    create
      .mockResolvedValueOnce(
        toolCall("create_form", { title: "Signup", questions: [{ type: "short_answer", title: "Your name" }] })
      )
      .mockResolvedValueOnce(finalText("Form created."));
    (createForm as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: "f1", shareToken: "ftok", title: "Signup" });

    const { actions } = await runChat({ userId: "u1", surface: "dashboard", messages: [{ role: "user", content: "make a signup form" }] });

    const payload = (createForm as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.sections).toHaveLength(1);
    expect(payload.sections[0].questions[0]).toMatchObject({ type: "short_answer", title: "Your name" });
    expect(actions[0]).toMatchObject({ kind: "created", entity: "form", url: "http://localhost:5173/f/ftok" });
  });

  it("builder: add_poll_question returns an action and never persists", async () => {
    create
      .mockResolvedValueOnce(toolCall("add_poll_question", { text: "Your name?", type: "open_ended" }))
      .mockResolvedValueOnce(finalText("Added! What next?"));

    const { actions } = await runChat({ userId: "u1", surface: "poll-builder", messages: [{ role: "user", content: "add a name question" }] });

    expect(createPoll).not.toHaveBeenCalled();
    expect(actions[0]).toMatchObject({ kind: "add_poll_question", question: { text: "Your name?", type: "open_ended" } });
  });

  it("self-heals: invalid create args are fed back and nothing is created", async () => {
    create
      .mockResolvedValueOnce(toolCall("create_poll", { questions: [] })) // no title, empty questions → Zod fails
      .mockResolvedValueOnce(finalText("I need a title and at least one question."));

    const { actions, reply } = await runChat({ userId: "u1", surface: "dashboard", messages: [{ role: "user", content: "make a poll" }] });

    expect(createPoll).not.toHaveBeenCalled();
    expect(actions).toHaveLength(0);
    expect(reply).toMatch(/title/i);
    // The second call must have received a tool result carrying the validation error.
    const secondCallMessages = create.mock.calls[1][0].messages;
    expect(secondCallMessages.some((m: { role: string; content?: string }) => m.role === "tool" && /error/i.test(m.content ?? ""))).toBe(true);
  });

  it("returns the plain reply when the model uses no tools", async () => {
    create.mockResolvedValueOnce(finalText("What kind of poll would you like?"));
    const { reply, actions } = await runChat({ userId: "u1", surface: "dashboard", messages: [{ role: "user", content: "hi" }] });
    expect(reply).toMatch(/what kind/i);
    expect(actions).toHaveLength(0);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
