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
export type BrandFont = "default" | "inter" | "poppins" | "dm-sans" | "lora" | "playfair" | "space-grotesk" | "nunito";
export type BrandRadius = "sharp" | "soft" | "round";
export type BrandBackground = "plain" | "tint";

/** The account's brand kit (Settings → Branding). */
export type UserBranding = {
  companyName: string;
  businessDetails: string;
  logoUrl: string;
  qrColor: string;
  accentColor: string;
  font: BrandFont;
  radius: BrandRadius;
  background: BrandBackground;
  website: string;
  supportEmail: string;
  qrLogo: boolean;
  qrLogoShape: "square" | "circle";
  shareImageUrl: string;
};

/** Brand resolved server-side for respondents; null when the plan lacks branding or the form opted out. */
export interface PublicBrand {
  companyName: string;
  logoUrl: string;
  accentColor: string;
  font: BrandFont;
  radius: BrandRadius;
  background: BrandBackground;
  website: string;
  supportEmail: string;
  redirectUrl: string;
  shareImageUrl: string;
}

/** Per-form tweaks on top of the brand kit. */
export interface FormBrandingOverride {
  useKit: boolean;
  accentColor?: string;
  redirectUrl?: string;
  shareTitle?: string;
  shareDescription?: string;
  shareImageUrl?: string;
}

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
  /** Only present on /auth/me; computed server-side from the ADMIN_EMAILS allowlist. */
  isAdmin?: boolean;
}

// ─── Onboarding ────────────────────────────────────────────────────────────────
export type OnboardingUsage = "company" | "education" | "public_sector" | "non_profit" | "student" | "other";
export type OnboardingIntent = "explore" | "create_polls" | "other";
export type OnboardingPlan = "free" | "basic" | "plus" | "pro";
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
  /** True when the creator's plan doesn't include branding. */
  showPoweredBy?: boolean;
  brand?: PublicBrand | null;
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

/** Whether the respondent's emailed copy of their answers went out. null = never attempted. */
export interface ReceiptInfo {
  status: "sent" | "failed";
  to: string;
  at: string;
  /** "auto" = sent on submit, "manual" = the creator pressed Send copy. */
  trigger: "auto" | "manual";
  error?: string;
}

/** Emailed-copy filter; "unsent" = has an address but no copy was ever attempted. */
export type ReceiptFilter = "sent" | "failed" | "unsent";
export type ReceiptSummary = Record<ReceiptFilter, number>;

export interface RespondentEntry {
  responseId: string;
  name: string;
  email: string | null;
  submittedAt: string;
  isComplete: boolean;
  receipt: ReceiptInfo | null;
  /** Every send attempt, oldest first. */
  receiptHistory: ReceiptInfo[];
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
  /** Quiz: publish the leaderboard automatically when the timer (expiresAt) ends. */
  autoPublishResults: boolean;
}

export interface Form {
  _id: string;
  creatorId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  branding?: FormBrandingOverride;
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
  showPoweredBy?: boolean;
  brand?: PublicBrand | null;
  /** Server clock at fetch time — countdowns use it to correct device clock skew. */
  serverTime?: string;
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
  /** Leaderboard name for a signed-out quiz taker. */
  respondentName?: string;
  /** The quiz timer ran out: submit what was answered. */
  timedOut?: boolean;
  answers: FormAnswerPayload[];
  isComplete: boolean;
}

/** Server-computed amount due; present only when the respondent picked priced options. */
export interface SubmitPaymentDue {
  totalAmount: number;
  selectedOptions: string[];
  message: string;
  upiId: string;
}

export interface SubmitFormResult {
  _id: string;
  isComplete: boolean;
  score?: number;
  totalPoints?: number;
  payment?: SubmitPaymentDue;
}

// ─── Quiz results & leaderboard ─────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  totalPoints: number;
  submittedAt: string;
  /** Public board: marks the viewer's own row. */
  isMe?: boolean;
  /** Creator board only. */
  responseId?: string;
  email?: string | null;
}

export interface QuizReviewItem {
  questionId: string;
  title: string;
  points: number;
  pointsEarned: number;
  isCorrect: boolean;
  yourAnswer: string[];
  correctAnswer: string[];
  feedback?: string;
}

export interface QuizResults {
  formId: string;
  title: string;
  status: string;
  expiresAt?: string;
  serverTime: string;
  autoPublishResults: boolean;
  resultsPublished: boolean;
  resultsPublishedAt?: string;
  maxPoints: number;
  /** Null when this viewer never submitted. Score is absent until it's released. */
  me: { name: string; submittedAt: string; score?: number; totalPoints?: number; rank?: number } | null;
  leaderboard: { participants: number; maxPoints: number; entries: LeaderboardEntry[] } | null;
  review: QuizReviewItem[] | null;
}

export interface CreatorLeaderboard {
  status: string;
  expiresAt?: string;
  autoPublishResults: boolean;
  resultsPublished: boolean;
  resultsPublishedAt?: string;
  maxPoints: number;
  participants: number;
  entries: LeaderboardEntry[];
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
  payment?: SubmitPaymentDue & { status: "pending" | "paid" | "failed" };
  answers: (FormAnswerPayload & { questionTitleSnapshot?: string; isCorrect?: boolean; pointsEarned?: number })[];
  receipt: ReceiptInfo | null;
  /** Every send attempt, oldest first. */
  receiptHistory: ReceiptInfo[];
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
  branding: FormBrandingOverride;
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

// ─── Admin ──────────────────────────────────────────────────────────────────────
export interface AdminOverview {
  totals: {
    users: number; verified: number; googleUsers: number; newUsers7: number; newUsers30: number; activeSessions: number;
    polls: number; forms: number; activePolls: number; activeForms: number;
    responses: number; pollResponses: number; formResponses: number; responses7: number;
  };
  timeline: { date: string; signups: number; polls: number; forms: number }[];
  topCreators: { id: string; name: string; email: string; polls: number; forms: number; responses: number }[];
  topContent: { id: string; kind: "poll" | "form"; title: string; status: string; responses: number; creator: string }[];
  plans: Record<PlanId, number>;
  pendingUpgrades: number;
  audience: { usage: string; count: number }[];
}

export interface AdminUserRow {
  id: string;
  plan: PlanId;
  planExpiresAt: string | null;
  name: string;
  email: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  provider: "google" | "password";
  createdAt: string;
  lastSeenAt: string | null;
  polls: number;
  forms: number;
  responses: number;
}

export interface AdminUsersPage {
  items: AdminUserRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminContentItem {
  id: string;
  title: string;
  status: string;
  responses: number;
  shareToken: string;
  createdAt: string;
  isDeleted: boolean;
  isQuiz?: boolean;
}

export interface AdminUserDetail {
  user: Omit<AdminUserRow, "lastSeenAt" | "polls" | "forms" | "responses"> & {
    assignedPlan: PlanId;
    hasCompletedOnboarding: boolean;
    onboarding: Record<string, string> | null;
    /** How they first found Kollects; only known when they allowed campaign cookies. */
    acquisition: {
      source?: string;
      medium?: string;
      campaign?: string;
      referrer?: string;
      landingPage?: string;
      firstSeenAt: string;
    } | null;
  };
  polls: AdminContentItem[];
  forms: AdminContentItem[];
  sessions: { userAgent: string; ipAddress: string; createdAt: string; lastUsedAt: string; active: boolean }[];
  /** Cookie decisions made while signed in as this user, newest first. */
  consent: { current: AdminConsentRecord | null; history: AdminConsentRecord[] };
}

// ─── Admin: site analytics & consent ────────────────────────────────────────────
export type ReportDays = 7 | 30 | 90;
export interface KeyCount { key: string; sessions?: number; users?: number }

export interface AdminSiteAnalytics {
  days: ReportDays;
  activeNow: number;
  totals: { pageviews: number; visitors: number; sessions: number; bounceRate: number; pagesPerSession: number; avgSessionSeconds: number };
  timeline: { date: string; pageviews: number; visitors: number }[];
  topPages: { path: string; views: number; visitors: number }[];
  landingPages: KeyCount[];
  sources: KeyCount[];
  campaigns: KeyCount[];
  devices: KeyCount[];
  browsers: KeyCount[];
  os: KeyCount[];
  events: { name: string; count: number; visitors: number }[];
  funnel: { step: string; visitors: number }[];
  signupSources: KeyCount[];
}

export type ConsentActionKind = "accept_all" | "reject_all" | "custom";
export interface AdminConsentRecord {
  id: string;
  consentId: string;
  user: { id: string; name: string; email: string } | null;
  analytics: boolean;
  marketing: boolean;
  action: ConsentActionKind;
  source: "banner" | "settings";
  version: number;
  page: string | null;
  gpc: boolean;
  device: string | null;
  browser: string | null;
  os: string | null;
  createdAt: string;
}
export interface AdminConsentReport {
  days: ReportDays;
  /** Each browser's latest decision. */
  current: {
    browsers: number;
    analytics: number;
    marketing: number;
    acceptAll: number;
    rejectAll: number;
    custom: number;
    gpc: number;
    /** Browsers that made more than one decision. */
    changedMind: number;
    /** Allowed analytics at some point, but their latest choice doesn't. */
    withdrew: number;
  };
  byVersion: { version: number; browsers: number }[];
  bySource: { source: "banner" | "settings"; browsers: number }[];
  inWindow: Record<ConsentActionKind, number>;
  timeline: ({ date: string } & Record<ConsentActionKind, number>)[];
}

export interface ConsentRecordFilters {
  search?: string;
  action?: ConsentActionKind;
  analytics?: boolean;
  marketing?: boolean;
  source?: "banner" | "settings";
}

export interface AdminConsentPage {
  items: AdminConsentRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Every decision one browser made, oldest first. */
export interface AdminConsentHistory {
  consentId: string;
  current: AdminConsentRecord;
  firstSeenAt: string;
  decisions: AdminConsentRecord[];
  users: { id: string; name: string; email: string }[];
}

export interface AdminTrafficPoint { t: string; requests: number; errors: number; clientErrors: number; avgMs: number }

export interface AdminEndpoint {
  route: string; // "GET /api/forms/:formId"
  count: number;
  clientErrors: number;
  errors: number;
  errorRate: number; // % of calls that returned 5xx
  avgMs: number;
  p50: number;
  p95: number;
  p99: number;
  maxMs: number;
  lastAt: string;
  lastError: { at: string; status: number; message: string } | null;
}

export interface AdminTraffic {
  since: string;
  totalRequests: number;
  requestsPerMinute: number;
  statusClasses: Record<"2xx" | "3xx" | "4xx" | "5xx", number>;
  latencyMs: { p50: number; p95: number; p99: number };
  lastHour: AdminTrafficPoint[];
  last24h: AdminTrafficPoint[];
  endpoints: AdminEndpoint[];
  recentErrors: { at: string; method: string; path: string; status: number; message: string }[];
}

export interface AdminSystem {
  status: "healthy" | "degraded";
  checks: { name: string; ok: boolean; detail: string }[];
  process: {
    uptimeSec: number; node: string; platform: string; environment: string; pid: number;
    memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
    cpuPercent: number;
    eventLoopDelayMs: { mean: number; p99: number; max: number };
  };
  host: { cores: number; loadAvg: number[]; totalMem: number; freeMem: number };
  database: { state: string; pingMs: number | null; name: string; host: string };
  sockets: { connected: number; rooms: number };
  jobs: { expiry: { lastRunAt: string | null; lastError: string | null; totalClosed: number } };
  integrations: { name: string; configured: boolean }[];
}

export interface AdminStorage {
  database: { dataSize?: number; storageSize?: number; indexSize?: number; objects?: number; collections?: number; error?: string };
  collections: { name: string; count: number; size: number | null; storageSize: number | null; indexSize: number | null }[];
  uploads: { files: number; bytes: number };
  cloudinary:
    | { configured: false }
    | { configured: true; error: string }
    | {
        configured: true; plan: string | null; storageBytes: number; bandwidthBytes: number; resources: number;
        creditsUsed: number | null; creditsLimit: number | null; creditsPercent: number | null;
      };
}

export type FormStatus = "draft" | "active" | "closed" | "published";

export interface FormCleanupFilter {
  from: string; // ISO
  to: string; // ISO
  statuses?: FormStatus[];
  onlyTrashed: boolean;
}

export interface FormCleanupPreview {
  forms: number;
  byStatus: Record<string, number>;
  trashed: number;
  live: number;
  responses: number;
  files: { count: number; bytes: number };
  images: number;
  assets: { toDelete: number; keptShared: number; external: number };
  sample: { id: string; title: string; status: string; isDeleted: boolean; createdAt: string; responses: number; creator: string }[];
}

export interface FormCleanupResult {
  formsDeleted: number;
  responsesDeleted: number;
  assets: { deleted: number; notFound: number; failed: number; attempted: number; keptShared: number };
  bytesFreed: number;
}

export interface AdminAuditEntry {
  id: string;
  adminEmail: string;
  action: string;
  params: { from: string; to: string; statuses: string[]; onlyTrashed: boolean };
  result: FormCleanupResult;
  at: string;
}

// ─── Plans & billing ────────────────────────────────────────────────────────────
export type PlanId = "free" | "plus" | "pro";
export type PlanMetric = "responses" | "uploads" | "aiMessages" | "liveItems";
export type PlanFeature = "customSlug" | "branding";

export interface PlanCatalogEntry {
  id: PlanId;
  label: string;
  tagline: string;
  priceMonthly: number; // INR
  priceYearly: number; // INR
  limits: Record<PlanMetric, number | null>; // null = unlimited
  features: Record<PlanFeature, boolean>;
  support: string;
}

export interface PlanState {
  plan: PlanId;
  label: string;
  assignedPlan: PlanId;
  expiresAt: string | null;
  period: string; // "YYYY-MM"
  features: Record<PlanFeature, boolean>;
  grace: number;
  usage: Record<PlanMetric, { used: number; limit: number | null }>;
}

export type BillingPeriod = "monthly" | "yearly";

export interface PlanRequest {
  id: string;
  plan: Exclude<PlanId, "free">;
  period: BillingPeriod;
  note: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  adminNote: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface AdminPlanRequest extends PlanRequest {
  user: { id: string; name: string; email: string; plan: PlanId } | null;
}

