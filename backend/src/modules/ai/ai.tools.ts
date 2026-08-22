import type OpenAI from "openai";
import { QUESTION_TYPES } from "../form/form.validation.js";

export type Surface = "dashboard" | "poll-builder" | "form-builder";

/** Action returned to the client to render (created link) or apply to a builder store. */
export type AiAction =
  | { kind: "created"; entity: "poll" | "form"; id: string; shareToken: string; url: string; title: string }
  | {
      kind: "add_poll_question";
      question: {
        text: string;
        type: "single_choice" | "multiple_choice" | "open_ended";
        isMandatory?: boolean | undefined;
        options?: string[] | undefined;
      };
    }
  | {
      kind: "add_form_question";
      question: {
        type: string;
        title: string;
        isRequired?: boolean | undefined;
        options?: string[] | undefined;
        rows?: string[] | undefined;
        columns?: string[] | undefined;
        scaleMin?: number | undefined;
        scaleMax?: number | undefined;
      };
    }
  | { kind: "set_meta"; entity: "poll" | "form"; title?: string | undefined; description?: string | undefined };

type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

const pollQuestionSchema = {
  type: "object",
  properties: {
    text: { type: "string", description: "The question text" },
    type: { type: "string", enum: ["single_choice", "multiple_choice", "open_ended"] },
    isMandatory: { type: "boolean" },
    options: { type: "array", items: { type: "string" }, description: "Choice labels; omit for open_ended" },
  },
  required: ["text", "type"],
  additionalProperties: false,
} as const;

const formQuestionSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: [...QUESTION_TYPES] },
    title: { type: "string", description: "The question label" },
    isRequired: { type: "boolean" },
    options: { type: "array", items: { type: "string" }, description: "For multiple_choice/checkboxes/dropdown" },
    rows: { type: "array", items: { type: "string" }, description: "For grid types" },
    columns: { type: "array", items: { type: "string" }, description: "For grid types" },
    scaleMin: { type: "number", description: "For linear_scale/rating" },
    scaleMax: { type: "number", description: "For linear_scale/rating" },
  },
  required: ["type", "title"],
  additionalProperties: false,
} as const;

// ─── Dashboard: create + persist, return a share link ─────────────────────────
export const dashboardTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "create_poll",
      description: "Create a poll once you have enough detail. Returns a shareable link.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          responseMode: { type: "string", enum: ["anonymous", "authenticated"] },
          questions: { type: "array", items: pollQuestionSchema, minItems: 1 },
        },
        required: ["title", "questions"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_form",
      description: "Create a form/survey/quiz once you have enough detail. Returns a shareable link.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          responseMode: { type: "string", enum: ["anonymous", "authenticated"] },
          isQuiz: { type: "boolean" },
          questions: { type: "array", items: formQuestionSchema, minItems: 1 },
        },
        required: ["title", "questions"],
        additionalProperties: false,
      },
    },
  },
];

// ─── Poll builder: drive the live preview one question at a time ───────────────
export const pollBuilderTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "add_poll_question",
      description: "Add ONE question to the poll being built. Call once per question.",
      parameters: pollQuestionSchema as unknown as Record<string, unknown>,
    },
  },
  {
    type: "function",
    function: {
      name: "set_poll_meta",
      description: "Set the poll title and/or description.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" }, description: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
];

// ─── Form builder: drive the live preview one question at a time ───────────────
export const formBuilderTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "add_form_question",
      description: "Add ONE question to the form being built. Call once per question.",
      parameters: formQuestionSchema as unknown as Record<string, unknown>,
    },
  },
  {
    type: "function",
    function: {
      name: "set_form_meta",
      description: "Set the form title and/or description.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" }, description: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
];

export function toolsForSurface(surface: Surface): Tool[] {
  if (surface === "poll-builder") return pollBuilderTools;
  if (surface === "form-builder") return formBuilderTools;
  return dashboardTools;
}

export function systemPrompt(surface: Surface, builderSummary?: string): string {
  const base =
    "You are Kollects AI, an assistant that helps users create polls and forms. " +
    "Be concise and friendly. Ask a clarifying question when the request is vague, " +
    "and proactively suggest better or additional questions.";
  if (surface === "dashboard") {
    return (
      base +
      " When you have enough detail, call create_poll or create_form. A poll is a quick " +
      "single/multiple-choice or open-ended vote; a form is a richer survey/quiz with many " +
      "question types. After creating, briefly confirm and tell the user their shareable link is ready. " +
      "Default responseMode to anonymous unless the user wants sign-in."
    );
  }
  const kind = surface === "poll-builder" ? "poll" : "form";
  return (
    base +
    ` The user is in the ${kind} builder and can SEE the ${kind} being built. ` +
    `Add questions ONE AT A TIME with the add_${kind}_question tool (one call per question), ` +
    `and use set_${kind}_meta for the title/description. After each addition, briefly confirm and ` +
    `suggest the next question. Do NOT try to save or publish — the user does that themselves. ` +
    (builderSummary ? `Current ${kind}: ${builderSummary}` : `The ${kind} is currently empty.`)
  );
}
