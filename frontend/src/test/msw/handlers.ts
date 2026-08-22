import { http, HttpResponse } from "msw";
import {
  makePublicForm,
  makePublicPoll,
  makeDashboardOverview,
  makeForm,
  oid,
} from "./factories";
import type {
  PublicForm,
  PublicPoll,
  DashboardOverview,
  SubmitFormResponsePayload,
  SubmitResponsePayload,
} from "@/types";

// In tests, config.apiUrl resolves to this (non-production branch).
const API = "http://localhost:3030/api";

/**
 * Mutable state the handlers read from. Tests set `testState.publicForm = …`
 * before rendering to express a scenario, and read `submittedForm`/`submittedPoll`
 * to assert what got sent. Reset between tests via `resetTestState()`.
 */
export const testState = {
  publicForm: makePublicForm() as PublicForm,
  publicPoll: makePublicPoll() as PublicPoll,
  overview: makeDashboardOverview() as DashboardOverview,
  submittedForm: null as SubmitFormResponsePayload | null,
  submittedPoll: null as SubmitResponsePayload | null,
  uploadCount: 0,
  failUpload: false,
  ai: {
    reply: "Sure!",
    actions: [] as unknown[],
    conversationId: "conv1",
    messages: [] as unknown[],
  },
  aiLastBody: null as Record<string, unknown> | null,
};

export function resetTestState() {
  testState.publicForm = makePublicForm();
  testState.publicPoll = makePublicPoll();
  testState.overview = makeDashboardOverview();
  testState.submittedForm = null;
  testState.submittedPoll = null;
  testState.uploadCount = 0;
  testState.failUpload = false;
  testState.ai = { reply: "Sure!", actions: [], conversationId: "conv1", messages: [] };
  testState.aiLastBody = null;
}

const ok = (data: unknown, message = "ok") =>
  HttpResponse.json({ statusCode: 200, data, message, success: true });

export const handlers = [
  // ─── Public forms ─────────────────────────────────────────────────────────
  http.get(`${API}/public/forms/:shareToken`, () => ok(testState.publicForm)),

  http.post(`${API}/form-responses/:formId`, async ({ request }) => {
    testState.submittedForm = (await request.json()) as SubmitFormResponsePayload;
    return ok({ _id: oid("resp"), isComplete: true, score: 3, totalPoints: 5 });
  }),

  http.post(`${API}/form-responses/:formId/upload`, async () => {
    testState.uploadCount++;
    if (testState.failUpload) {
      return HttpResponse.json({ error: { message: "Upload failed" } }, { status: 400 });
    }
    return ok({ url: "https://cdn.test/file.png", name: "file.png", size: 1234, mimeType: "image/png" });
  }),

  // ─── Public polls ─────────────────────────────────────────────────────────
  http.get(`${API}/public/polls/:shareToken`, () => ok(testState.publicPoll)),
  http.get(`${API}/public/polls/:shareToken/status`, () =>
    ok({ status: testState.publicPoll.status, alreadyResponded: testState.publicPoll.alreadyResponded })
  ),
  http.post(`${API}/responses/:pollId`, async ({ request }) => {
    testState.submittedPoll = (await request.json()) as SubmitResponsePayload;
    return ok({ responseId: oid("resp"), message: "recorded", totalResponses: 11 });
  }),

  // ─── Dashboard / analytics ──────────────────────────────────────────────────
  http.get(`${API}/dashboard/overview`, () => ok(testState.overview)),
  http.get(`${API}/analytics/:pollId/timeline`, () => ok(testState.overview.timeline.map((t) => ({ date: t.date, count: t.polls })))),
  http.get(`${API}/form-analytics/:formId/timeline`, () => ok(testState.overview.timeline.map((t) => ({ date: t.date, count: t.forms })))),

  // ─── Forms CRUD (creator) ────────────────────────────────────────────────────
  http.get(`${API}/forms`, () => ok({ forms: [makeForm()], pagination: { page: 1, limit: 12, total: 1, totalPages: 1, hasNext: false, hasPrev: false } })),
  http.post(`${API}/forms`, async ({ request }) => {
    const body = (await request.json()) as { title?: string };
    return ok(makeForm({ title: body?.title ?? "Untitled" }));
  }),
  http.post(`${API}/forms/upload`, () => ok({ url: "https://cdn.test/cover.png" })),

  // ─── AI assistant ─────────────────────────────────────────────────────────────
  http.post(`${API}/ai/chat`, async ({ request }) => {
    testState.aiLastBody = (await request.json()) as Record<string, unknown>;
    return ok({
      conversationId: testState.ai.conversationId,
      reply: testState.ai.reply,
      actions: testState.ai.actions,
    });
  }),
  http.get(`${API}/ai/conversations`, () => ok([])),
  http.get(`${API}/ai/conversations/:id`, () => ok({ _id: "conv1", title: "Chat", messages: testState.ai.messages })),
  http.delete(`${API}/ai/conversations/:id`, () => ok({ deleted: true })),
];
