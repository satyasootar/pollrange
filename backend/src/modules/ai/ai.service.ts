import type OpenAI from "openai";
import mongoose from "mongoose";
import { aiClient, AI_MODEL } from "./ai.client.js";
import { toolsForSurface, systemPrompt, type Surface, type AiAction } from "./ai.tools.js";
import { createPoll } from "../poll/poll.service.js";
import { createForm } from "../form/form.service.js";
import { createPollSchema } from "../poll/poll.validation.js";
import { createFormSchema, CHOICE_TYPES, GRID_TYPES } from "../form/form.validation.js";
import config from "../../config/config.js";

export type ChatMsg = { role: "user" | "assistant"; content: string };

const MAX_ITERS = 5; // cap tool-call rounds so a confused model can't loop forever
const MAX_HISTORY = 20; // cap messages sent to the model (token budget)
const oid = () => new mongoose.Types.ObjectId().toString();

/** Runs one chat turn: may call tools (create poll/form, or add builder questions). */
export async function runChat(opts: {
  userId: string;
  surface: Surface;
  messages: ChatMsg[];
  builderSummary?: string | undefined;
}): Promise<{ reply: string; actions: AiAction[] }> {
  const { userId, surface, messages, builderSummary } = opts;
  const tools = toolsForSurface(surface);
  const actions: AiAction[] = [];

  const oaMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(surface, builderSummary) },
    ...messages
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
  ];

  for (let i = 0; i < MAX_ITERS; i++) {
    const completion = await aiClient.chat.completions.create({
      model: AI_MODEL,
      messages: oaMessages,
      tools,
      tool_choice: "auto",
      temperature: 0.4,
    });
    const msg = completion.choices[0]?.message;
    if (!msg) break;

    const toolCalls = msg.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return { reply: msg.content ?? "", actions };
    }

    oaMessages.push(msg as OpenAI.Chat.Completions.ChatCompletionMessageParam);
    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        /* leave empty; executeTool will surface a validation error */
      }
      let result: string;
      try {
        result = await executeTool(userId, call.function.name, args, actions);
      } catch (err) {
        result = `Error: ${err instanceof Error ? err.message : "failed"}. Please correct the arguments and try again.`;
      }
      oaMessages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  // Iteration cap reached — get a plain text wrap-up (no tools).
  const final = await aiClient.chat.completions.create({ model: AI_MODEL, messages: oaMessages, temperature: 0.4 });
  return { reply: final.choices[0]?.message?.content ?? "Done.", actions };
}

async function executeTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
  actions: AiAction[]
): Promise<string> {
  switch (name) {
    case "create_poll": {
      const payload = createPollSchema.parse(toPollPayload(args));
      const doc = (await createPoll(userId, payload)) as unknown as { _id: unknown; shareToken: string; title: string };
      const url = `${config.CLIENT_URL}/p/${doc.shareToken}`;
      actions.push({ kind: "created", entity: "poll", id: String(doc._id), shareToken: doc.shareToken, url, title: doc.title });
      return `Created poll "${doc.title}". Shareable link: ${url}`;
    }
    case "create_form": {
      const payload = createFormSchema.parse(toFormPayload(args));
      const doc = (await createForm(userId, payload)) as unknown as { _id: unknown; shareToken: string; title: string };
      const url = `${config.CLIENT_URL}/f/${doc.shareToken}`;
      actions.push({ kind: "created", entity: "form", id: String(doc._id), shareToken: doc.shareToken, url, title: doc.title });
      return `Created form "${doc.title}". Shareable link: ${url}`;
    }
    case "add_poll_question": {
      actions.push({
        kind: "add_poll_question",
        question: {
          text: String(args.text ?? ""),
          type: (args.type as "single_choice" | "multiple_choice" | "open_ended") ?? "single_choice",
          isMandatory: args.isMandatory as boolean | undefined,
          options: cleanStrings(args.options),
        },
      });
      return "Added the question to the poll builder.";
    }
    case "add_form_question": {
      actions.push({
        kind: "add_form_question",
        question: {
          type: String(args.type ?? "short_answer"),
          title: String(args.title ?? ""),
          isRequired: args.isRequired as boolean | undefined,
          options: cleanStrings(args.options),
          rows: cleanStrings(args.rows),
          columns: cleanStrings(args.columns),
          scaleMin: args.scaleMin as number | undefined,
          scaleMax: args.scaleMax as number | undefined,
        },
      });
      return "Added the question to the form builder.";
    }
    case "set_poll_meta":
      actions.push({ kind: "set_meta", entity: "poll", title: args.title as string | undefined, description: args.description as string | undefined });
      return "Updated the poll details.";
    case "set_form_meta":
      actions.push({ kind: "set_meta", entity: "form", title: args.title as string | undefined, description: args.description as string | undefined });
      return "Updated the form details.";
    default:
      return `Unknown tool: ${name}`;
  }
}

function cleanStrings(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => String(x).trim()).filter(Boolean);
  return out.length ? out : undefined;
}

// ─── model args → create-schema payloads ──────────────────────────────────────
function toPollPayload(args: Record<string, unknown>) {
  const questions = Array.isArray(args.questions) ? args.questions : [];
  return {
    title: args.title,
    description: args.description,
    responseMode: (args.responseMode as string) ?? "anonymous",
    questions: questions.map((q: Record<string, unknown>, i: number) => {
      const type = (q.type as string) ?? "single_choice";
      const opts = cleanStrings(q.options);
      return {
        text: q.text,
        type,
        isMandatory: q.isMandatory ?? true,
        order: i,
        options: type === "open_ended" || !opts ? undefined : opts.map((text, oi) => ({ text, order: oi })),
      };
    }),
  };
}

function toFormPayload(args: Record<string, unknown>) {
  const questions = Array.isArray(args.questions) ? args.questions : [];
  return {
    title: args.title,
    description: args.description,
    responseMode: (args.responseMode as string) ?? "anonymous",
    isQuiz: (args.isQuiz as boolean) ?? false,
    sections: [
      {
        _id: oid(),
        order: 0,
        questions: questions.map((q: Record<string, unknown>, i: number) => buildFormQuestion(q, i)),
      },
    ],
  };
}

function buildFormQuestion(q: Record<string, unknown>, order: number) {
  const type = String(q.type ?? "short_answer");
  const base: Record<string, unknown> = {
    _id: oid(),
    order,
    type,
    title: q.title,
    isRequired: q.isRequired ?? false,
  };
  if (CHOICE_TYPES.includes(type as never)) {
    base.options = (cleanStrings(q.options) ?? []).map((text, oi) => ({ _id: oid(), text, order: oi }));
  }
  if (GRID_TYPES.includes(type as never)) {
    base.rows = cleanStrings(q.rows) ?? [];
    base.columns = cleanStrings(q.columns) ?? [];
  }
  if (type === "linear_scale" || type === "rating") {
    base.scaleMin = (q.scaleMin as number) ?? 1;
    base.scaleMax = (q.scaleMax as number) ?? 5;
  }
  return base;
}
