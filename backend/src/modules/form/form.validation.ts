import { z } from "zod";
import mongoose from "mongoose";
import { optionalExpiresAtSchema } from "../../utils/zod-helpers.js";
import { DEFAULT_PAYMENT_MESSAGE, UPI_ID_REGEX } from "./payment.util.js";

// ─── Shared enums (single source of truth) ──────────────────────────────────────
export const QUESTION_TYPES = [
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
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const FORM_STATUSES = ["draft", "active", "closed", "published"] as const;
export const RESPONSE_MODES = ["anonymous", "authenticated"] as const;

/** Choice-style types carry an `options[]` array. */
export const CHOICE_TYPES: QuestionType[] = ["multiple_choice", "checkboxes", "dropdown"];
/** Grid-style types carry `rows[]` + `columns[]`. */
export const GRID_TYPES: QuestionType[] = ["multiple_choice_grid", "checkbox_grid"];
/** Types that can be graded in quiz mode. */
export const GRADABLE_TYPES: QuestionType[] = [
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "short_answer",
];

// ─── DB shape (superset; Mongoose stores only the fields relevant to `type`) ─────
const optionZodSchema = z.object({
  text: z.string(),
  order: z.number(),
  imageUrl: z.string().optional(),
  responseCount: z.number().default(0),
  amount: z.number().min(0).max(1000000).optional(),
});

const paymentConfigZodSchema = z.object({
  enabled: z.boolean(),
  upiId: z.string().trim().regex(UPI_ID_REGEX, "Enter a valid UPI ID (e.g. name@okaxis)"),
  messageTemplate: z.string().max(200).default(DEFAULT_PAYMENT_MESSAGE),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
}).superRefine((payment, ctx) => {
  if (payment.minSelections !== undefined && payment.maxSelections !== undefined && payment.minSelections > payment.maxSelections) {
    ctx.addIssue({ code: "custom", message: "minSelections cannot exceed maxSelections", path: ["minSelections"] });
  }
});

const validationRuleZodSchema = z.object({
  kind: z.enum(["number_range", "regex", "length"]),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
});

const fileConfigZodSchema = z.object({
  maxFiles: z.number().default(1),
  maxSizeMb: z.number().default(10),
  allowedTypes: z.array(z.string()).default([]),
});

const answerKeyZodSchema = z.object({
  correctOptionIds: z.array(z.string()).optional(),
  correctText: z.string().optional(),
  feedback: z.string().optional(),
});

const formQuestionZodSchema = z.object({
  order: z.number(),
  type: z.enum(QUESTION_TYPES),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  isRequired: z.boolean().default(false),
  // choice / dropdown
  options: z.array(optionZodSchema).optional(),
  payment: paymentConfigZodSchema.optional(),
  optionNavigation: z.record(z.string(), z.string()).optional(),
  // scale / rating
  scaleMin: z.number().optional(),
  scaleMax: z.number().optional(),
  scaleMinLabel: z.string().optional(),
  scaleMaxLabel: z.string().optional(),
  // grids
  rows: z.array(z.string()).optional(),
  columns: z.array(z.string()).optional(),
  // file
  fileConfig: fileConfigZodSchema.optional(),
  // text / number validation
  validation: validationRuleZodSchema.optional(),
  // quiz
  points: z.number().optional(),
  answerKey: answerKeyZodSchema.optional(),
});

const sectionZodSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number(),
  questions: z.array(formQuestionZodSchema),
  navigation: z
    .object({
      type: z.enum(["next", "submit", "byAnswer"]),
      questionId: z.string().optional(),
    })
    .optional(),
});

const formSettingsZodSchema = z.object({
  collectEmail: z.boolean().default(false),
  limitOneResponse: z.boolean().default(false),
  allowResponseEdit: z.boolean().default(false),
  showProgressBar: z.boolean().default(true),
  shuffleQuestions: z.boolean().default(false),
  confirmationMessage: z.string().optional(),
  releaseScoreImmediately: z.boolean().default(true),
});

export const formZodSchema = z.object({
  creatorId: z.custom<mongoose.Types.ObjectId>(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  coverImageUrl: z.string().optional(),
  shareToken: z.string(),
  isQuiz: z.boolean().default(false),
  status: z.enum(FORM_STATUSES).default("draft"),
  responseMode: z.enum(RESPONSE_MODES),
  expiresAt: z.date().optional().nullable(),
  totalResponses: z.number().default(0),
  isDeleted: z.boolean().default(false),
  isResultsPublic: z.boolean().default(false),
  publishedAt: z.date().optional(),
  closedAt: z.date().optional(),
  resultsPublishedAt: z.date().optional(),
  settings: formSettingsZodSchema.optional(),
  sections: z.array(sectionZodSchema),
});

export type IForm = z.infer<typeof formZodSchema>;
export type ISection = z.infer<typeof sectionZodSchema>;
export type IFormQuestion = z.infer<typeof formQuestionZodSchema>;
export type IFormOption = z.infer<typeof optionZodSchema>;

// ─── Request-facing schemas (whitelist client-editable fields only) ─────────────
// Deliberately EXCLUDE server-controlled fields: creatorId, shareToken, status,
// totalResponses, responseCount, isDeleted, publishedAt, etc. — prevents mass-assignment.
// Client generates stable 24-hex `_id`s so branching targets, quiz answer keys, and
// option counters reference the same identity before AND after persistence.
const createOptionSchema = z.object({
  _id: z.string().optional(),
  text: z.string().min(1),
  order: z.number(),
  imageUrl: z.string().optional(),
  amount: z.number().min(0).max(1000000).optional(),
});

/**
 * A single question in a create/update request. Kept as a superset object validated
 * by a `superRefine` (rather than a discriminatedUnion) so the schema stays readable;
 * the per-type required-field rules below give the same guarantees.
 */
const createQuestionSchema = z
  .object({
    _id: z.string().optional(),
    order: z.number(),
    type: z.enum(QUESTION_TYPES),
    title: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    isRequired: z.boolean().default(false),
    options: z.array(createOptionSchema).optional(),
    payment: paymentConfigZodSchema.optional(),
    // maps an option key -> target section key | "submit"
    optionNavigation: z.record(z.string(), z.string()).optional(),
    scaleMin: z.number().optional(),
    scaleMax: z.number().optional(),
    scaleMinLabel: z.string().optional(),
    scaleMaxLabel: z.string().optional(),
    rows: z.array(z.string()).optional(),
    columns: z.array(z.string()).optional(),
    fileConfig: fileConfigZodSchema.partial().optional(),
    validation: validationRuleZodSchema.optional(),
    points: z.number().min(0).optional(),
    answerKey: answerKeyZodSchema.optional(),
  })
  .superRefine((q, ctx) => {
    if (CHOICE_TYPES.includes(q.type) && (!q.options || q.options.length < 1)) {
      ctx.addIssue({ code: "custom", message: `${q.type} requires at least one option`, path: ["options"] });
    }
    if (GRID_TYPES.includes(q.type)) {
      if (!q.rows || q.rows.length < 1)
        ctx.addIssue({ code: "custom", message: "Grid requires at least one row", path: ["rows"] });
      if (!q.columns || q.columns.length < 1)
        ctx.addIssue({ code: "custom", message: "Grid requires at least one column", path: ["columns"] });
    }
    if ((q.type === "linear_scale" || q.type === "rating") && (q.scaleMin === undefined || q.scaleMax === undefined)) {
      ctx.addIssue({ code: "custom", message: "Scale requires scaleMin and scaleMax", path: ["scaleMin"] });
    }
    if (q.scaleMin !== undefined && q.scaleMax !== undefined && q.scaleMax <= q.scaleMin) {
      ctx.addIssue({ code: "custom", message: "scaleMax must be greater than scaleMin", path: ["scaleMax"] });
    }
  });

const createSectionSchema = z.object({
  _id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number(),
  questions: z.array(createQuestionSchema),
  navigation: z
    .object({
      type: z.enum(["next", "submit", "byAnswer"]),
      questionId: z.string().optional(),
    })
    .optional(),
});

export const createFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]+$/, "Slug may contain only letters, numbers, hyphens, and underscores")
    .min(3)
    .max(80)
    .optional(),
  coverImageUrl: z.string().optional(),
  isQuiz: z.boolean().optional(),
  responseMode: z.enum(RESPONSE_MODES),
  expiresAt: optionalExpiresAtSchema,
  settings: formSettingsZodSchema.partial().optional(),
  sections: z.array(createSectionSchema).min(1),
});

export const updateFormSchema = createFormSchema.partial();

export type ICreateForm = z.infer<typeof createFormSchema>;
export type IUpdateForm = z.infer<typeof updateFormSchema>;
export type ICreateQuestion = z.infer<typeof createQuestionSchema>;
export type ICreateSection = z.infer<typeof createSectionSchema>;

export const publishFormSchema = z.object({
  mode: z.enum(["live", "permanent"]).default("permanent"),
});
export type IPublishForm = z.infer<typeof publishFormSchema>;

export const reopenFormSchema = z.object({
  expiresAt: optionalExpiresAtSchema,
});
export type IReopenForm = z.infer<typeof reopenFormSchema>;
