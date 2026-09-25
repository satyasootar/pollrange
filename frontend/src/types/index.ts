// ─── API Envelope ────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ─── User / Auth ──────────────────────────────────────────────────────────────
export type UserBranding = {
  companyName: string;
  businessDetails: string;
  logoUrl: string;
  qrColor: string;
};

export interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  role: "user" | "admin";
  isActive: boolean;
  branding?: UserBranding;
  hasCompletedOnboarding: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Onboarding ────────────────────────────────────────────────────────────────
export type OnboardingUsage = "company" | "education" | "public_sector" | "non_profit" | "student" | "other";
export type OnboardingIntent = "explore" | "create_polls" | "other";
export type OnboardingPlan = "free" | "basic" | "pro";
export type OnboardingFirstAction = "word_cloud" | "polls" | "quiz" | "open_ended";

export interface CompleteOnboardingPayload {
  usage: OnboardingUsage;
  usageDetail?: string;
  intent: OnboardingIntent;
  plan: OnboardingPlan;
  firstAction: OnboardingFirstAction;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

// ─── Poll Entities ────────────────────────────────────────────────────────────
export interface PollOption {
  _id: string;
  text: string;
  order: number;
}

export interface PollQuestion {
  _id: string;
  text: string;
  type: "single_choice" | "multiple_choice" | "open_ended";
  options: PollOption[];
  isMandatory: boolean;
  order: number;
}

export interface PollSettings {
  allowResponseEdit: boolean;
  showProgressBar: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
}

export type PollStatus = "draft" | "active" | "closed" | "published";
export type ResponseMode = "anonymous" | "authenticated";

export interface Poll {
  _id: string;
  creatorId: string;
  title: string;
  description?: string;
  shareToken: string;
  questions: PollQuestion[];
  responseMode: ResponseMode;
  status: PollStatus;
  expiresAt: string;
  totalResponses: number;
  isDeleted: boolean;
  publishedAt?: string;
  closedAt?: string;
  settings: PollSettings;
  createdAt: string;
  updatedAt: string;
}

// ─── Public Poll (respondent view) ───────────────────────────────────────────
export interface PublicPollQuestion {
  questionId: string;
  text: string;
  type: "single_choice" | "multiple_choice" | "open_ended";
  isMandatory: boolean;
  order: number;
  options: { optionId: string; text: string; order: number }[];
}

export interface PublicPoll {
  pollId: string;
  title: string;
  description?: string;
  responseMode: ResponseMode;
  status: "active" | "closed" | "published" | "expired";
  expiresAt: string;
  totalResponses: number;
  requiresAuth: boolean;
  isResultsPublic?: boolean;
  alreadyResponded: boolean;
  settings: Pick<
    PollSettings,
    "showProgressBar" | "randomizeQuestions" | "randomizeOptions"
  >;
  questions: PublicPollQuestion[];
}

// ─── Response submission ──────────────────────────────────────────────────────
export interface AnswerPayload {
  questionId: string;
  selectedOptionId: string | null;
  selectedOptionIds: string[]; // For multiple choice
  textResponse?: string | null;
  skipped: boolean;
}

export interface SubmitResponsePayload {
  sessionToken: string;
  answers: AnswerPayload[];
  isComplete: boolean;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface OptionStat {
  optionId: string;
  optionText: string;
  count: number;
  percentage: number;
}

export interface QuestionStat {
  questionId: string;
  questionText: string;
  type: "single_choice" | "multiple_choice" | "open_ended";
  isMandatory: boolean;
  responseCount: number;
  skippedCount: number;
  options: OptionStat[];
  topOption: { optionId: string; optionText: string; count: number };
  wordCloudData?: WordCloudItem[];
}

export interface TimelinePoint {
  date: string;
  count: number;
}

export type TimelineGranularity = "minute" | "hour" | "day" | "week" | "month";

// ─── AI assistant ───────────────────────────────────────────────────────────────
export type AiSurface = "dashboard" | "poll-builder" | "form-builder";

export interface AiCreatedAction {
  kind: "created";
  entity: "poll" | "form";
  id: string;
  shareToken: string;
  url: string;
  title: string;
}
export interface AiAddPollQuestionAction {
  kind: "add_poll_question";
  question: {
    text: string;
    type: "single_choice" | "multiple_choice" | "open_ended";
    isMandatory?: boolean;
    options?: string[];
  };
}
export interface AiAddFormQuestionAction {
  kind: "add_form_question";
  question: {
    type: FormQuestionType;
    title: string;
    isRequired?: boolean;
    options?: string[];
    rows?: string[];
    columns?: string[];
    scaleMin?: number;
    scaleMax?: number;
  };
}
export interface AiSetMetaAction {
  kind: "set_meta";
  entity: "poll" | "form";
  title?: string;
  description?: string;
}
export type AiAction = AiCreatedAction | AiAddPollQuestionAction | AiAddFormQuestionAction | AiSetMetaAction;

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: AiAction[];
}
export interface AiChatResponse {
  conversationId?: string;
  reply: string;
  actions: AiAction[];
  title?: string;
}
export interface AiConversationListItem {
  _id: string;
  title: string;
  updatedAt: string;
}
export interface AiConversationDetail {
  _id: string;
  title: string;
  messages: AiChatMessage[];
}

// ─── Creator dashboard overview (polls + forms combined) ────────────────────────
export interface DashboardTopItem {
  id: string;
  title: string;
  responses: number;
  status: string;
}

export interface DashboardOverview {
  totals: { polls: number; forms: number; responses: number; active: number; drafts: number };
  responsesSplit: { polls: number; forms: number };
  statusBreakdown: { status: string; polls: number; forms: number }[];
  topPolls: DashboardTopItem[];
  topForms: DashboardTopItem[];
  timeline: { date: string; polls: number; forms: number }[];
}

export interface WordCloudItem {
  text: string;
  value: number;
}

export interface FullAnalytics {
  pollId: string;
  pollTitle: string;
  status: string;
  expiresAt: string;
  totalResponses: number;
  completionRate: number;
  anonymousCount: number;
  authenticatedCount: number;
  questions: QuestionStat[];
  timeline: TimelinePoint[];
}

export interface RespondentEntry {
  responseId: string;
  name: string;
  email: string | null;
  submittedAt: string;
  isComplete: boolean;
}

// ─── Socket event payloads ────────────────────────────────────────────────────
export interface NewResponsePayload {
  pollId: string;
  totalResponses: number;
  timestamp: string;
}

// The server emits only { pollId, totalResponses, questions(raw) } and the client
// refetches full analytics over REST, so richer fields are not guaranteed here.
export interface AnalyticsUpdatePayload {
  pollId: string;
  totalResponses: number;
  completionRate?: number;
  questions?: unknown;
}

export interface PollStatusChangePayload {
  pollId: string;
  status: PollStatus;
  reason?: string;
  closedAt?: string;
}

// ─── Poll builder form state ──────────────────────────────────────────────────
export interface BuilderOption {
  id: string; // local uuid
  text: string;
}

export interface BuilderQuestion {
  id: string; // local uuid
  text: string;
  type: "single_choice" | "multiple_choice" | "open_ended";
  isMandatory: boolean;
  options: BuilderOption[];
}

export interface PollBuilderForm {
  title: string;
  description: string;
  expiresAt: string;
  responseMode: ResponseMode;
  settings: Omit<PollSettings, "allowResponseEdit">;
  questions: BuilderQuestion[];
}

// ─── Query filters ────────────────────────────────────────────────────────────
export interface PollFilters {
  page?: number;
  limit?: number;
  status?: PollStatus | "all";
  search?: string;
  sortBy?: "createdAt" | "totalResponses" | "expiresAt";
  sortOrder?: "asc" | "desc";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Forms feature — separate from Polls
// ═══════════════════════════════════════════════════════════════════════════════

export type FormQuestionType =
  | "short_answer"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale"
  | "rating"
  | "date"
  | "time"
  | "multiple_choice_grid"
  | "checkbox_grid"
  | "file_upload";

export interface FormOption {
  _id: string;
  text: string;
  order: number;
  imageUrl?: string;
  responseCount?: number;
  amount?: number;
}

export interface PaymentConfig {
  enabled: boolean;
  upiId: string;
  messageTemplate: string;
  minSelections?: number;
  maxSelections?: number;
}

export interface ValidationRule {
  kind: "number_range" | "regex" | "length";
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface FileConfig {
  maxFiles: number;
  maxSizeMb: number;
  allowedTypes: string[];
}

export interface AnswerKey {
  correctOptionIds?: string[];
  correctText?: string;
  feedback?: string;
}

/**
 * Entity question shape (superset — only the fields relevant to `type` are
 * populated). Narrow with `question.type` in per-type editors/renderers.
 */
export interface FormQuestion {
  _id: string;
  order: number;
  type: FormQuestionType;
  title: string;
  description?: string;
  imageUrl?: string;
  isRequired: boolean;
  options?: FormOption[];
  payment?: PaymentConfig;
  optionNavigation?: Record<string, string>;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  rows?: string[];
  columns?: string[];
  fileConfig?: FileConfig;
  validation?: ValidationRule;
  points?: number;
  answerKey?: AnswerKey;
}

export interface FormSectionNavigation {
  type: "next" | "submit" | "byAnswer";
  questionId?: string;
}

export interface FormSection {
  _id: string;
  title?: string;
  description?: string;
  order: number;
  questions: FormQuestion[];
  navigation?: FormSectionNavigation;
}

export interface FormSettings {
  collectEmail: boolean;
  limitOneResponse: boolean;
  allowResponseEdit: boolean;
  showProgressBar: boolean;
  shuffleQuestions: boolean;
  confirmationMessage?: string;
  releaseScoreImmediately: boolean;
}

export interface Form {
  _id: string;
  creatorId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  shareToken: string;
  isQuiz: boolean;
  status: PollStatus;
  responseMode: ResponseMode;
  expiresAt?: string;
  totalResponses: number;
  isDeleted: boolean;
  isResultsPublic: boolean;
  publishedAt?: string;
  closedAt?: string;
  settings: FormSettings;
  sections: FormSection[];
  createdAt: string;
  updatedAt: string;
}

// ─── Public form (respondent view) — answer keys + counts stripped ──────────────
export interface PublicForm {
  formId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  isQuiz: boolean;
  responseMode: ResponseMode;
  status: "active" | "closed" | "published" | "expired";
  expiresAt?: string;
  totalResponses: number;
  alreadyResponded: boolean;
  settings: FormSettings;
  sections: FormSection[];
}

// ─── Form response submission ───────────────────────────────────────────────────
export interface FormFileValue {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface FormGridValue {
  row: string;
  columns: string[];
}

export interface FormAnswerPayload {
  questionId: string;
  textValue?: string | null;
  numberValue?: number | null;
  dateValue?: string | null;
  selectedOptionIds?: string[];
  scaleValue?: number | null;
  gridValues?: FormGridValue[];
  fileUrls?: FormFileValue[];
  skipped: boolean;
}

export interface SubmitFormResponsePayload {
  sessionToken: string;
  respondentEmail?: string;
  answers: FormAnswerPayload[];
  isComplete: boolean;
}

export interface SubmitFormResult {
  _id: string;
  isComplete: boolean;
  score?: number;
  totalPoints?: number;
}

// ─── Form analytics ─────────────────────────────────────────────────────────────
export interface FormSummary {
  formId: string;
  title: string;
  status: string;
  isQuiz: boolean;
  expiresAt?: string;
  totalResponses: number;
  completionRate: number;
  timeline: TimelinePoint[];
  browserStats: Record<string, number>;
  quiz?: { averageScore: number; totalPoints: number };
}

/** Per-question summary — shape varies by `type` (options/distribution/matrix/values/files). */
export interface FormQuestionSummary {
  questionId: string;
  title: string;
  type: FormQuestionType;
  responseCount: number;
  options?: OptionStat[];
  scaleMin?: number;
  scaleMax?: number;
  distribution?: Record<string, number>;
  average?: number;
  rows?: string[];
  columns?: string[];
  matrix?: Record<string, Record<string, number>>;
  files?: FormFileValue[];
  values?: string[];
}

export interface IndividualFormResponse {
  responseId: string;
  name: string;
  email: string | null;
  submittedAt: string;
  isComplete: boolean;
  score?: number;
  totalPoints?: number;
  answers: (FormAnswerPayload & { questionTitleSnapshot?: string; isCorrect?: boolean; pointsEarned?: number })[];
}

// ─── Form builder state ─────────────────────────────────────────────────────────
export interface BuilderFormOption {
  id: string;
  text: string;
  amount?: number;
}

/** Grid rows/columns in the builder carry a stable id so React keys survive edits. */
export interface GridItem {
  id: string;
  label: string;
}

export interface BuilderFormQuestion {
  id: string;
  type: FormQuestionType;
  title: string;
  description?: string;
  isRequired: boolean;
  options: BuilderFormOption[];
  payment?: PaymentConfig;
  optionNavigation?: Record<string, string>;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  rows?: GridItem[];
  columns?: GridItem[];
  fileConfig?: FileConfig;
  validation?: ValidationRule;
  points?: number;
  answerKey?: AnswerKey;
}

export interface BuilderFormSection {
  id: string;
  title?: string;
  description?: string;
  questions: BuilderFormQuestion[];
  navigation?: FormSectionNavigation;
}

export interface FormBuilderForm {
  title: string;
  description: string;
  slug: string;
  coverImageUrl?: string;
  isQuiz: boolean;
  expiresAt: string;
  responseMode: ResponseMode;
  settings: Omit<FormSettings, "confirmationMessage"> & { confirmationMessage: string };
  sections: BuilderFormSection[];
}

export interface FormFilters {
  page?: number;
  limit?: number;
  status?: PollStatus | "all";
  search?: string;
}
