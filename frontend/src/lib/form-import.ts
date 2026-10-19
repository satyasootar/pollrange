import { z } from "zod";
import { makeQuestion } from "@/store/use-form-builder-store";
import { CHOICE_TYPES, GRID_TYPES, GRADABLE_TYPES } from "@/components/form-builder/question-types";
import { newObjectId, toLocalDatetimeInput } from "@/lib/utils";
import type { BuilderFormQuestion, BuilderFormSection, FormBuilderForm, FormQuestionType } from "@/types";

/**
 * Human/AI-friendly import format. Options are referenced by their text and sections
 * by their 1-based number, so nobody has to invent ids; we map to builder ids here.
 */
const QUESTION_TYPES = [
  "short_answer",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
  "rating",
  "date",
  "time",
  "multiple_choice_grid",
  "checkbox_grid",
  "file_upload",
] as const satisfies readonly FormQuestionType[];

/** Optional close time as the builder's local "YYYY-MM-DDTHH:mm" (any date string Date can read is accepted). */
export const closesAtSchema = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "closesAt must be a date like 2026-12-31T18:00")
  .refine((v) => new Date(v).getTime() > Date.now(), "closesAt must be in the future")
  .transform((v) => toLocalDatetimeInput(new Date(v)));

const goTo = z.union([z.number().int().min(1), z.literal("submit")]);

const optionSchema = z.union([
  z.string().trim().min(1).max(500),
  z.object({ text: z.string().trim().min(1).max(500), goTo: goTo.optional() }),
]);

const questionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  title: z.string().trim().min(1, "Every question needs a title").max(500),
  description: z.string().max(1000).optional(),
  required: z.boolean().optional(),
  options: z.array(optionSchema).max(20).optional(),
  scaleMin: z.number().int().min(0).max(1).optional(),
  scaleMax: z.number().int().min(3).max(10).optional(),
  scaleMinLabel: z.string().max(100).optional(),
  scaleMaxLabel: z.string().max(100).optional(),
  rows: z.array(z.string().trim().min(1)).max(20).optional(),
  columns: z.array(z.string().trim().min(1)).max(20).optional(),
  maxFiles: z.number().int().min(1).max(10).optional(),
  maxSizeMb: z.number().int().min(1).max(10).optional(),
  validation: z
    .object({
      kind: z.enum(["length", "number_range", "regex"]),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
  correct: z.array(z.string()).optional(),
  correctText: z.string().optional(),
  points: z.number().min(0).optional(),
  feedback: z.string().max(1000).optional(),
});

const sectionSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  after: z.enum(["next", "submit"]).optional(),
  questions: z.array(questionSchema).min(1, "Every section needs at least one question"),
});

export const formImportSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(1000).optional(),
    isQuiz: z.boolean().optional(),
    requireSignIn: z.boolean().optional(),
    closesAt: closesAtSchema.optional(),
    quizTimer: z
      .object({ mode: z.enum(["none", "per_person", "live"]), durationMinutes: z.number().int().min(1).max(600).optional() })
      .refine((t) => t.mode === "none" || t.durationMinutes !== undefined, { message: "quizTimer needs durationMinutes" })
      .optional(),
    settings: z
      .object({
        collectEmail: z.boolean(),
        limitOneResponse: z.boolean(),
        allowResponseEdit: z.boolean(),
        showProgressBar: z.boolean(),
        shuffleQuestions: z.boolean(),
        releaseScoreImmediately: z.boolean(),
        autoPublishResults: z.boolean(),
        confirmationMessage: z.string().max(500),
      })
      .partial()
      .optional(),
    sections: z.array(sectionSchema).min(1).max(50).optional(),
    // Shortcut for single-page forms.
    questions: z.array(questionSchema).min(1).optional(),
  })
  .refine((f) => !!f.sections !== !!f.questions, {
    message: 'Provide either "sections" or "questions" (not both)',
  });

export type FormImport = z.infer<typeof formImportSchema>;
type ImportQuestion = z.infer<typeof questionSchema>;

const optionText = (o: z.infer<typeof optionSchema>) => (typeof o === "string" ? o : o.text);

function toBuilderQuestion(src: ImportQuestion, where: string, isQuiz: boolean): BuilderFormQuestion {
  const q = makeQuestion(src.type);
  q.title = src.title;
  if (src.description) q.description = src.description;
  q.isRequired = src.required ?? false;

  if (CHOICE_TYPES.includes(src.type)) {
    if (!src.options?.length) throw new Error(`${where}: "${src.type}" needs an "options" array`);
    q.options = src.options.map((o) => ({ id: newObjectId(), text: optionText(o) }));
  }
  if (GRID_TYPES.includes(src.type)) {
    if (!src.rows?.length || !src.columns?.length) throw new Error(`${where}: "${src.type}" needs "rows" and "columns"`);
    q.rows = src.rows.map((label) => ({ id: newObjectId(), label }));
    q.columns = src.columns.map((label) => ({ id: newObjectId(), label }));
  }
  if (src.type === "linear_scale" || src.type === "rating") {
    if (src.scaleMin !== undefined) q.scaleMin = src.scaleMin;
    if (src.scaleMax !== undefined) q.scaleMax = src.scaleMax;
    if (src.type === "linear_scale") {
      if (src.scaleMinLabel) q.scaleMinLabel = src.scaleMinLabel;
      if (src.scaleMaxLabel) q.scaleMaxLabel = src.scaleMaxLabel;
    }
  }
  if (src.type === "file_upload") {
    q.fileConfig = { maxFiles: src.maxFiles ?? 1, maxSizeMb: src.maxSizeMb ?? 10, allowedTypes: [] };
  }
  if (src.validation && (src.type === "short_answer" || src.type === "paragraph")) q.validation = src.validation;

  if (isQuiz && GRADABLE_TYPES.includes(src.type)) {
    q.points = src.points ?? 1;
    if (src.type === "short_answer") {
      if (src.correctText) q.answerKey = { correctText: src.correctText };
    } else if (src.correct?.length) {
      const ids = src.correct.map((text) => {
        const opt = q.options.find((o) => o.text.trim().toLowerCase() === text.trim().toLowerCase());
        if (!opt) throw new Error(`${where}: correct answer "${text}" is not one of its options`);
        return opt.id;
      });
      if (src.type !== "checkboxes" && ids.length > 1)
        throw new Error(`${where}: "${src.type}" can only have one correct answer (use "checkboxes" for several)`);
      q.answerKey = { correctOptionIds: ids };
    }
    if (src.feedback) q.answerKey = { ...q.answerKey, feedback: src.feedback };
  }
  return q;
}

/** Points at the offending spot using the position V8/Firefox put in JSON.parse errors. */
function describeJsonError(text: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const pos = Number(/position (\d+)/.exec(msg)?.[1] ?? NaN);
  let where = "";
  if (Number.isFinite(pos)) {
    const line = text.slice(0, pos).split("\n").length;
    const snippet = text.slice(Math.max(0, pos - 40), pos + 20).replace(/\s+/g, " ");
    where = `\nNear line ${line}: …${snippet}…`;
  }
  return `That isn't valid JSON: ${msg}${where}\nTip: quotes inside text must be written as \\" (one backslash), or use single quotes instead.`;
}

/**
 * AI chats often wrap JSON in ``` fences and double-escape quotes inside strings (\\" instead of \").
 * Fences are always stripped; the quote repair is only tried when the raw text fails to parse.
 */
export function parseLenient(text: string): unknown {
  const unfenced = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(unfenced);
  } catch (err) {
    try {
      return JSON.parse(unfenced.replace(/\\\\"/g, '\\"'));
    } catch {
      throw new Error(describeJsonError(unfenced, err));
    }
  }
}

/** Pretty-prints import JSON (after the same fence stripping + quote repair). Throws a readable Error if unparseable. */
export function formatImportJson(text: string): string {
  return JSON.stringify(parseLenient(text), null, 2);
}

/** Parses import JSON into a fresh builder form. Throws an Error with a readable message. */
export function parseFormImport(text: string, base: FormBuilderForm): FormBuilderForm {
  const raw = parseLenient(text);
  const parsed = formImportSchema.safeParse(raw);
  if (!parsed.success) throw new Error(z.prettifyError(parsed.error));
  const f = parsed.data;
  const isQuiz = f.isQuiz ?? false;
  const quizTimer = isQuiz && f.quizTimer ? f.quizTimer : { mode: "none" as const };
  const srcSections = f.sections ?? [{ questions: f.questions! }];

  const sections: BuilderFormSection[] = srcSections.map((s, si) => ({
    id: newObjectId(),
    title: s.title,
    description: s.description,
    questions: s.questions.map((q, qi) => toBuilderQuestion(q, `Section ${si + 1}, question ${qi + 1}`, isQuiz)),
  }));

  // Navigation needs section ids, so resolve it once every section exists.
  srcSections.forEach((s, si) => {
    const section = sections[si]!;
    const branchIdx = s.questions.findIndex((q) => q.options?.some((o) => typeof o !== "string" && o.goTo !== undefined));
    if (branchIdx === -1) {
      if (s.after) section.navigation = { type: s.after };
      return;
    }
    // The builder branches on the section's first choice question only.
    const firstChoice = s.questions.findIndex((q) => CHOICE_TYPES.includes(q.type));
    if (branchIdx !== firstChoice)
      throw new Error(`Section ${si + 1}: "goTo" only works on the first multiple-choice/checkbox/dropdown question of a section`);
    const branchQ = section.questions[branchIdx]!;
    const optionNavigation: Record<string, string> = {};
    s.questions[branchIdx]!.options!.forEach((o, oi) => {
      if (typeof o === "string" || o.goTo === undefined) return;
      if (o.goTo === "submit") optionNavigation[branchQ.options[oi]!.id] = "submit";
      else {
        const target = sections[o.goTo - 1];
        if (!target || o.goTo === si + 1)
          throw new Error(`Section ${si + 1}: goTo ${o.goTo} must be another section number between 1 and ${sections.length}`);
        optionNavigation[branchQ.options[oi]!.id] = target.id;
      }
    });
    branchQ.optionNavigation = optionNavigation;
    section.navigation = { type: "byAnswer", questionId: branchQ.id };
  });

  return {
    ...base,
    title: f.title,
    description: f.description ?? "",
    isQuiz,
    responseMode: f.requireSignIn ? "authenticated" : "anonymous",
    quizTimer,
    // A live quiz ends when the host says so, never at a fixed time.
    expiresAt: quizTimer.mode === "live" ? "" : (f.closesAt ?? ""),
    settings: { ...base.settings, ...f.settings },
    sections,
  };
}

export const FORM_IMPORT_PROMPT = `You are a friendly helper that builds a form for the Kollects form builder. First you interview the user, then you write the form as JSON that they paste into Kollects.

HOW TO TALK TO THE USER
- Ask ONE question per message, then stop and wait for the answer. Never put two questions in one message.
- Use simple, everyday words. Never say JSON, boolean, field, schema, mode or setting names. Say "Should people log in first?", not "requireSignIn".
- Keep each message short: a progress tag like (3/9), the question, then numbered choices when there are any. Mark the most common choice with "(recommended)".
- The user can reply with a number, their own words, or "skip". "skip" means: use the recommended choice.
- If an answer is unclear, ask about that one thing again in different words.
- Skip questions that don't apply (the quiz-only ones for a normal form) and don't number them.
- Start with a one-line greeting, then go straight to question 1.

THE INTERVIEW (in this order, settings first, then the topic)
1. Is this a quiz with right answers and a score, or a normal form (survey, sign-up, feedback, registration)?
2. Should people log in before filling it? 1) No, anyone with the link (recommended) 2) Yes, they must log in (one answer per account; for a quiz, their account name goes on the leaderboard).
3. Quiz only: is there a time limit? 1) No time limit (recommended) 2) Each person gets their own timer that starts when they press Start 3) Live: you press Start and everyone's timer runs together. For 2 or 3, ask next how many minutes (1-600).
4. Quiz only: should each person see their score right after they submit? 1) Yes (recommended) 2) No, only when you publish the results.
5. Quiz only, and only for a live quiz or a quiz with a closing time: should the results and leaderboard go public automatically when time is up? 1) No, I'll publish them myself (recommended) 2) Yes, automatically.
6. Should it stop accepting answers on a certain date and time? 1) No (recommended) 2) Yes. Ask for the date and time. Skip this for a live quiz.
7. Normal form only: should people be limited to one answer each, and should their email be collected? Offer 1) No to both (recommended) 2) One answer each 3) Collect email 4) Both.
8. What is it about, and who will fill it in? (The topic. Ask for anything that helps: subject, audience, level, purpose.)
9. How many questions, and any must-have questions or question types? Suggest a number that fits (for example 10 for a quiz). For a quiz also ask the difficulty: easy, medium or hard.
10. What message should people see after they submit? Offer a suggested message based on the topic as the recommended choice.

AFTER THE INTERVIEW
- Show a short plain-language summary (type, login, timer, results, closing time, topic, number of questions) and ask "Shall I create it?". Change anything they correct.
- When they say yes, write the questions yourself from the topic: clear wording, sensible question types, realistic options. For a quiz, every gradable question gets exactly the right "correct" answer(s) and a short "feedback". Use several sections (pages) only for long forms or when the topic splits naturally.
- Then reply with ONLY the JSON object described below inside one json code block, followed by one line: "Copy this and paste it into Import JSON in Kollects."
- If they later ask for changes, reply with the complete updated JSON again, never just the changed part.

STRICT JSON RULES (the importer rejects anything else)
- Must pass JSON.parse as-is: double-quoted keys and strings, no trailing commas, no comments, no single-quoted strings.
- Do NOT put double quotes inside text values. For code, quoted words or string literals inside a title/option, use single quotes or backticks instead: write 2 + '3', not 2 + "3".
- Never double-escape. If a double quote is truly unavoidable inside a string, write \\" (ONE backslash). \\\\" is invalid.
- No raw line breaks inside strings; keep every string on one line.
- Every text in "correct" must be copied character-for-character from that question's "options".
- Option texts within one question must be unique.

TOP LEVEL
{
  "title": string,                 // required, max 200 chars
  "description": string,           // optional, max 1000 chars
  "isQuiz": boolean,               // optional, default false. true = graded quiz (see QUIZ below)
  "requireSignIn": boolean,        // optional, default false. true = respondents must sign in (forced on if any file_upload question exists). Sign-in quizzes show account names on the leaderboard; otherwise takers type a display name
  "closesAt": "YYYY-MM-DDTHH:mm",  // optional, local time in the future. The form stops accepting answers then. Ignored for live quizzes
  "quizTimer": {                   // optional, quizzes only. Omit for no time limit (see QUIZ TIMER below)
    "mode": "none" | "per_person" | "live",
    "durationMinutes": number      // 1-600, required unless mode is "none"
  },
  "settings": {                    // optional, every key optional
    "collectEmail": boolean,           // default false
    "limitOneResponse": boolean,       // default false
    "allowResponseEdit": boolean,      // default false
    "showProgressBar": boolean,        // default true
    "shuffleQuestions": boolean,       // default false
    "releaseScoreImmediately": boolean,// quiz only, default true: show each respondent their score right after submitting
    "autoPublishResults": boolean,     // quiz only, default false: publish results + leaderboard automatically when a live quiz ends or "closesAt" passes. Otherwise the creator publishes them by hand
    "confirmationMessage": string      // shown after submit
  },
  "sections": [ SECTION, ... ]     // use "sections" for multi-page forms...
  // OR "questions": [ QUESTION, ... ] for a simple one-page form. Never both.
}

SECTION (each section is one page; respondents move through them in order)
{
  "title": string,                 // optional
  "description": string,           // optional
  "after": "next" | "submit",      // optional. What happens after this page. Default: "next" (last section submits)
  "questions": [ QUESTION, ... ]   // required, at least 1
}

QUESTION
{
  "type": one of the types below,  // required
  "title": string,                 // required, the question text
  "description": string,           // optional helper text
  "required": boolean              // optional, default false
  ...plus the type-specific fields below
}

QUESTION TYPES
- "short_answer"           one-line text. Optional "validation".
- "paragraph"              multi-line text. Optional "validation".
- "multiple_choice"        SINGLE choice (radio buttons, respondent picks exactly one). Needs "options".
- "checkboxes"             MULTIPLE choice (checkboxes, respondent picks any number). Needs "options".
- "dropdown"               single choice from a dropdown list. Needs "options".
- "linear_scale"           numeric scale. Optional "scaleMin" (0 or 1, default 1), "scaleMax" (3-10, default 5), "scaleMinLabel", "scaleMaxLabel".
- "rating"                 star rating. Optional "scaleMax" (3-10 stars, default 5).
- "date"                   date picker. No extra fields.
- "time"                   time picker. No extra fields.
- "multiple_choice_grid"   grid, one pick per row. Needs "rows": [string] and "columns": [string].
- "checkbox_grid"          grid, several picks per row. Needs "rows": [string] and "columns": [string].
- "file_upload"            file upload. Optional "maxFiles" (1-10, default 1), "maxSizeMb" (1-10, default 10).

OPTIONS (for multiple_choice, checkboxes, dropdown; 1-20 options, each text unique)
- Simple:          "options": ["Red", "Green", "Blue"]
- With branching:  "options": [{ "text": "Yes", "goTo": 3 }, { "text": "No", "goTo": "submit" }, "Maybe"]
  "goTo" is a 1-based section number to jump to, or "submit" to end the form. Options without goTo continue to the next section.
  Branching is only allowed on the FIRST multiple_choice/checkboxes/dropdown question of a section, and a section cannot jump to itself.

VALIDATION (short_answer / paragraph only, optional)
"validation": { "kind": "length" | "number_range" | "regex", "min": number, "max": number, "pattern": string, "message": string }
  length = character count between min/max; number_range = answer must be a number between min/max; regex = must match "pattern".

QUIZ (only when "isQuiz": true; applies to multiple_choice, checkboxes, dropdown, short_answer)
- "points": number              // default 1
- "correct": [string]           // option texts that are correct, copied exactly. One item for multiple_choice/dropdown; one or more for checkboxes.
- "correctText": string         // short_answer only: the expected answer
- "feedback": string            // optional explanation shown with the result
Non-gradable types (paragraph, scales, grids, dates, files) may appear in a quiz but carry no points.

QUIZ TIMER (quizzes only; pick the mode that matches the request)
- "none"        no time limit. Add "closesAt" if the quiz should stop at a fixed time.
- "per_person"  each taker gets "durationMinutes" from the moment THEY press Start (a refresh does not reset it). "closesAt" is still an optional hard stop for everyone.
- "live"        the creator presses Start on the quiz dashboard and everyone's "durationMinutes" timer runs together; people joining late get the time left. Do not set "closesAt".
When time runs out, answers given so far are submitted automatically. On the leaderboard, equal scores are ordered by the faster time.

EXAMPLE
{
  "title": "Team Offsite Survey",
  "description": "Help us plan the next offsite.",
  "isQuiz": false,
  "settings": { "collectEmail": true, "confirmationMessage": "Thanks! See you there." },
  "sections": [
    {
      "title": "About you",
      "questions": [
        { "type": "short_answer", "title": "Your name", "required": true },
        { "type": "multiple_choice", "title": "Will you attend?", "required": true,
          "options": [{ "text": "Yes", "goTo": 2 }, { "text": "No", "goTo": "submit" }] }
      ]
    },
    {
      "title": "Preferences",
      "questions": [
        { "type": "checkboxes", "title": "Which activities interest you?", "options": ["Hiking", "Board games", "Cooking class"] },
        { "type": "linear_scale", "title": "How excited are you?", "scaleMin": 1, "scaleMax": 5, "scaleMinLabel": "Meh", "scaleMaxLabel": "Very" },
        { "type": "multiple_choice_grid", "title": "Rate each meal option", "rows": ["Lunch", "Dinner"], "columns": ["Poor", "OK", "Great"] }
      ]
    }
  ]
}

QUIZ EXAMPLE (single page)
{
  "title": "Geography Quiz",
  "isQuiz": true,
  "quizTimer": { "mode": "per_person", "durationMinutes": 10 },
  "settings": { "releaseScoreImmediately": true, "autoPublishResults": false },
  "questions": [
    { "type": "multiple_choice", "title": "Capital of France?", "required": true, "options": ["Paris", "Rome", "Berlin"], "correct": ["Paris"], "points": 2 },
    { "type": "checkboxes", "title": "Which are in Asia?", "options": ["India", "Japan", "Peru"], "correct": ["India", "Japan"] },
    { "type": "short_answer", "title": "Largest ocean?", "correctText": "Pacific", "feedback": "The Pacific covers about a third of Earth." }
  ]
}

Before writing the JSON, re-check the STRICT JSON RULES above, especially: no double quotes inside text values.

Start now: greet the user in one line and ask question 1.
`;
