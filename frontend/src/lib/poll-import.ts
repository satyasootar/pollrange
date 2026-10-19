import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { closesAtSchema, parseLenient } from "@/lib/form-import";
import type { BuilderQuestion, PollBuilderForm } from "@/types";

const questionSchema = z
  .object({
    type: z.enum(["single_choice", "multiple_choice", "open_ended"]),
    text: z.string().trim().min(1, "Every question needs a text"),
    required: z.boolean().optional(),
    options: z.array(z.string().trim().min(1)).max(10, "At most 10 options per question").optional(),
  })
  .superRefine((q, ctx) => {
    const opts = q.options ?? [];
    if (q.type === "open_ended") {
      if (opts.length) ctx.addIssue({ code: "custom", message: '"open_ended" questions take no "options"' });
      return;
    }
    if (opts.length < 2) ctx.addIssue({ code: "custom", message: `"${q.type}" needs at least 2 "options"` });
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length)
      ctx.addIssue({ code: "custom", message: "Option texts within a question must be unique" });
  });

export const pollImportSchema = z.object({
  title: z.string().trim().min(3, "title needs at least 3 characters").max(200),
  description: z.string().max(1000).optional(),
  requireSignIn: z.boolean().optional(),
  closesAt: closesAtSchema.optional(),
  settings: z
    .object({ showProgressBar: z.boolean(), randomizeQuestions: z.boolean(), randomizeOptions: z.boolean() })
    .partial()
    .optional(),
  questions: z.array(questionSchema).min(1),
});

/** Parses import JSON into a fresh poll builder form. Throws an Error with a readable message. */
export function parsePollImport(text: string, base: PollBuilderForm): PollBuilderForm {
  const parsed = pollImportSchema.safeParse(parseLenient(text));
  if (!parsed.success) throw new Error(z.prettifyError(parsed.error));
  const p = parsed.data;
  const questions: BuilderQuestion[] = p.questions.map((q) => ({
    id: uuidv4(),
    text: q.text,
    type: q.type,
    isMandatory: q.required ?? true,
    options: (q.options ?? []).map((text) => ({ id: uuidv4(), text })),
  }));
  return {
    ...base,
    title: p.title,
    description: p.description ?? "",
    expiresAt: p.closesAt ?? "",
    responseMode: p.requireSignIn ? "authenticated" : "anonymous",
    settings: { ...base.settings, ...p.settings },
    questions,
  };
}

export const POLL_IMPORT_PROMPT = `You are generating a poll definition for the Kollects poll builder. Output ONLY one JSON object (no markdown fences, no comments, no extra text) that follows this exact structure.

STRICT JSON RULES (the importer rejects anything else)
- Must pass JSON.parse as-is: double-quoted keys and strings, no trailing commas, no comments, no single-quoted strings.
- Do NOT put double quotes inside text values; use single quotes instead.
- Never double-escape. If a double quote is truly unavoidable inside a string, write \\" (ONE backslash). \\\\" is invalid.
- No raw line breaks inside strings; keep every string on one line.
- Option texts within one question must be unique.

TOP LEVEL
{
  "title": string,                 // required, 3-200 chars
  "description": string,           // optional, max 1000 chars
  "requireSignIn": boolean,        // optional, default false. true = voters must sign in (one vote per account)
  "closesAt": "YYYY-MM-DDTHH:mm",  // optional, local time in the future. The poll stops accepting votes then
  "settings": {                    // optional, every key optional
    "showProgressBar": boolean,      // default true
    "randomizeQuestions": boolean,   // default false: shuffle question order per voter
    "randomizeOptions": boolean      // default false: shuffle option order per voter
  },
  "questions": [ QUESTION, ... ]   // required, at least 1
}

QUESTION
{
  "type": "single_choice" | "multiple_choice" | "open_ended", // required
  "text": string,                  // required, the question
  "required": boolean,             // optional, default true
  "options": [string, ...]         // single_choice / multiple_choice only: 2-10 unique options. Omit for open_ended
}

QUESTION TYPES
- "single_choice"    voter picks exactly one option (radio buttons).
- "multiple_choice"  voter picks any number of options (checkboxes).
- "open_ended"       free-text answer; results show a word cloud.

EXAMPLE
{
  "title": "Team Lunch Poll",
  "description": "Help us pick Friday's lunch.",
  "closesAt": "2030-01-31T12:00",
  "settings": { "randomizeOptions": true },
  "questions": [
    { "type": "single_choice", "text": "Which cuisine?", "options": ["Indian", "Italian", "Mexican"] },
    { "type": "multiple_choice", "text": "Any dietary needs?", "required": false, "options": ["Vegetarian", "Vegan", "Gluten-free"] },
    { "type": "open_ended", "text": "Anything else we should know?", "required": false }
  ]
}

Before answering, re-check the STRICT JSON RULES above, especially: no double quotes inside text values.

Now create a poll for the following request:
`;
