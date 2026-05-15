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
export interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  role: "user" | "admin";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  type: "single_choice" | "open_ended";
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
  type: "single_choice" | "open_ended";
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
  type: "single_choice" | "open_ended";
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

// ─── Socket event payloads ────────────────────────────────────────────────────
export interface NewResponsePayload {
  pollId: string;
  totalResponses: number;
  timestamp: string;
}

export interface AnalyticsUpdatePayload {
  pollId: string;
  totalResponses: number;
  completionRate: number;
  questions: QuestionStat[];
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
  type: "single_choice" | "open_ended";
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
