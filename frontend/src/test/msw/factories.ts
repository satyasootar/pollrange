// Factories for backend-shaped mock data used by MSW handlers and tests.
// Every builder takes an overrides object so tests can express edge cases tersely.
import type {
  PublicForm,
  FormSection,
  FormQuestion,
  FormSettings,
  PublicPoll,
  PublicPollQuestion,
  DashboardOverview,
  Form,
} from "@/types";

let seq = 0;
export const oid = (prefix = "id") => `${prefix}${(++seq).toString().padStart(6, "0")}`;

export const defaultFormSettings = (o: Partial<FormSettings> = {}): FormSettings => ({
  collectEmail: false,
  limitOneResponse: false,
  allowResponseEdit: false,
  showProgressBar: true,
  shuffleQuestions: false,
  releaseScoreImmediately: true,
  confirmationMessage: "Your response has been recorded.",
  ...o,
});

export const makeFormQuestion = (o: Partial<FormQuestion> = {}): FormQuestion => ({
  _id: oid("q"),
  order: 0,
  type: "short_answer",
  title: "Your name",
  isRequired: false,
  options: [],
  ...o,
});

export const makeChoiceQuestion = (o: Partial<FormQuestion> = {}): FormQuestion =>
  makeFormQuestion({
    type: "multiple_choice",
    title: "Pick one",
    options: [
      { _id: oid("opt"), text: "Alpha", order: 0 },
      { _id: oid("opt"), text: "Beta", order: 1 },
    ],
    ...o,
  });

export const makeSection = (questions: FormQuestion[], o: Partial<FormSection> = {}): FormSection => ({
  _id: oid("sec"),
  order: 0,
  questions,
  ...o,
});

export const makePublicForm = (o: Partial<PublicForm> = {}): PublicForm => {
  const { settings, sections, ...rest } = o;
  return {
    formId: oid("form"),
    title: "Customer Feedback",
    description: "Tell us what you think",
    isQuiz: false,
    responseMode: "anonymous",
    status: "active",
    totalResponses: 3,
    alreadyResponded: false,
    sections: sections ?? [makeSection([makeFormQuestion({ isRequired: true })])],
    ...rest,
    settings: defaultFormSettings(settings),
  };
};

export const makeForm = (o: Partial<Form> = {}): Form => {
  const { settings, ...rest } = o;
  return {
    _id: oid("form"),
    creatorId: oid("user"),
    title: "Customer Feedback",
    shareToken: "tok-" + oid("t"),
    isQuiz: false,
    status: "active",
    responseMode: "anonymous",
    totalResponses: 3,
    isDeleted: false,
    isResultsPublic: false,
    sections: [makeSection([makeFormQuestion()])],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...rest,
    settings: defaultFormSettings(settings),
  };
};

// ─── Polls ──────────────────────────────────────────────────────────────────────
export const makePublicPollQuestion = (o: Partial<PublicPollQuestion> = {}): PublicPollQuestion => ({
  questionId: oid("pq"),
  text: "Favourite colour?",
  type: "single_choice",
  isMandatory: false,
  order: 0,
  options: [
    { optionId: oid("po"), text: "Red", order: 0 },
    { optionId: oid("po"), text: "Blue", order: 1 },
  ],
  ...o,
});

export const makePublicPoll = (o: Partial<PublicPoll> = {}): PublicPoll => ({
  pollId: oid("poll"),
  title: "Quick Poll",
  description: "One question",
  responseMode: "anonymous",
  status: "active",
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  totalResponses: 10,
  requiresAuth: false,
  alreadyResponded: false,
  settings: { showProgressBar: true, randomizeQuestions: false, randomizeOptions: false },
  questions: [makePublicPollQuestion({ isMandatory: true })],
  ...o,
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const makeDashboardOverview = (o: Partial<DashboardOverview> = {}): DashboardOverview => ({
  totals: { polls: 2, forms: 1, responses: 42, active: 2, drafts: 1 },
  responsesSplit: { polls: 30, forms: 12 },
  statusBreakdown: [
    { status: "active", polls: 1, forms: 1 },
    { status: "draft", polls: 1, forms: 0 },
  ],
  topPolls: [{ id: oid("poll"), title: "Top Poll", responses: 30, status: "active" }],
  topForms: [{ id: oid("form"), title: "Top Form", responses: 12, status: "active" }],
  timeline: [
    { date: "2026-08-01", polls: 5, forms: 2 },
    { date: "2026-08-02", polls: 0, forms: 0 },
    { date: "2026-08-03", polls: 25, forms: 10 },
  ],
  ...o,
});
