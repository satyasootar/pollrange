import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

vi.mock("../form/form.model.js", () => ({ Form: { findOne: vi.fn(), updateOne: vi.fn(), findById: vi.fn() } }));
vi.mock("./form-response.model.js", () => ({ FormResponse: { findOne: vi.fn(), create: vi.fn(), exists: vi.fn() } }));
vi.mock("./quiz-attempt.model.js", () => ({ QuizAttempt: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock("../../socket/index.js", () => ({ emitFormAnalyticsUpdate: vi.fn(), emitFormStatusChange: vi.fn(), emitQuizLiveState: vi.fn() }));
vi.mock("../billing/billing.service.js", () => ({ consume: vi.fn(), refund: vi.fn() }));

import { Form } from "../form/form.model.js";
import { FormResponse } from "./form-response.model.js";
import { QuizAttempt } from "./quiz-attempt.model.js";
import { startQuizAttempt, submitResponse } from "./form-response.service.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const oid = () => new mongoose.Types.ObjectId();
const qId = oid();
const right = oid().toString();
const meta = { ipHash: "h", userAgent: "ua" };
const MIN = 60_000;

const quiz = (o: Record<string, unknown> = {}) => ({
  _id: oid(),
  creatorId: "c",
  status: "active",
  responseMode: "anonymous",
  isQuiz: true,
  settings: {},
  sections: [
    {
      questions: [
        { _id: qId, type: "multiple_choice", title: "Pick", isRequired: true, points: 1, options: [{ _id: right, text: "R" }], answerKey: { correctOptionIds: [right] } },
      ],
    },
  ],
  ...o,
});
const body = (extra: Record<string, unknown> = {}) => ({
  sessionToken: "s1",
  isComplete: true,
  answers: [{ questionId: qId.toString(), selectedOptionIds: [right], skipped: false, gridValues: [], fileUrls: [] }],
  ...extra,
});
const attemptIs = (doc: unknown) => m(QuizAttempt.findOne).mockReturnValue({ lean: async () => doc });

beforeEach(() => {
  vi.clearAllMocks();
  m(FormResponse.findOne).mockResolvedValue(null);
  m(FormResponse.create).mockImplementation(async (doc: any) => ({ ...doc }));
  m(Form.updateOne).mockResolvedValue({ modifiedCount: 0 });
  m(Form.findById).mockReturnValue({ select: vi.fn().mockResolvedValue({ totalResponses: 1 }) });
});

describe("submitResponse: live quiz", () => {
  it("refuses answers before the host starts", async () => {
    m(Form.findOne).mockResolvedValue(quiz({ quizTimer: { mode: "live", durationMinutes: 10 } }));
    await expect(submitResponse("f", body() as any, meta)).rejects.toMatchObject({ statusCode: 403 });
    expect(FormResponse.create).not.toHaveBeenCalled();
  });

  it("records time taken from the host's start", async () => {
    const startedAt = new Date(Date.now() - 3 * MIN);
    m(Form.findOne).mockResolvedValue(
      quiz({ quizTimer: { mode: "live", durationMinutes: 10 }, liveStartedAt: startedAt, expiresAt: new Date(Date.now() + 7 * MIN) })
    );
    await submitResponse("f", body() as any, meta);
    const doc = m(FormResponse.create).mock.calls[0]![0];
    expect(doc.startedAt).toBe(startedAt);
    expect(doc.timeTakenMs).toBeGreaterThanOrEqual(3 * MIN);
    expect(doc.timeTakenMs).toBeLessThan(3 * MIN + 5_000);
  });
});

describe("submitResponse: per-person timer", () => {
  const perPerson = () => quiz({ quizTimer: { mode: "per_person", durationMinutes: 10 } });

  it("refuses a submit without pressing Start", async () => {
    m(Form.findOne).mockResolvedValue(perPerson());
    attemptIs(null);
    await expect(submitResponse("f", body() as any, meta)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("refuses once the personal deadline plus grace has passed", async () => {
    m(Form.findOne).mockResolvedValue(perPerson());
    attemptIs({ startedAt: new Date(Date.now() - 11 * MIN), endsAt: new Date(Date.now() - MIN) });
    await expect(submitResponse("f", body() as any, meta)).rejects.toMatchObject({ statusCode: 410 });
  });

  it("accepts a timed-out partial attempt at the personal deadline and caps time taken at the limit", async () => {
    m(Form.findOne).mockResolvedValue(perPerson());
    attemptIs({ startedAt: new Date(Date.now() - 10 * MIN - 2_000), endsAt: new Date(Date.now() - 2_000) });
    // Required question left empty: only allowed because the timer ran out.
    const partial = body({ timedOut: true, answers: [{ questionId: qId.toString(), selectedOptionIds: [], skipped: true, gridValues: [], fileUrls: [] }] });
    await submitResponse("f", partial as any, meta);
    expect(m(FormResponse.create).mock.calls[0]![0].timeTakenMs).toBe(10 * MIN);
  });
});

describe("submitResponse: untimed quiz", () => {
  it("refuses a submit without pressing Start, so nobody dodges the time tie-break", async () => {
    m(Form.findOne).mockResolvedValue(quiz());
    attemptIs(null);
    await expect(submitResponse("f", body() as any, meta)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("records time taken from the server-side Start", async () => {
    m(Form.findOne).mockResolvedValue(quiz());
    attemptIs({ startedAt: new Date(Date.now() - 2 * MIN) });
    await submitResponse("f", body() as any, meta);
    const doc = m(FormResponse.create).mock.calls[0]![0];
    expect(doc.timeTakenMs).toBeGreaterThanOrEqual(2 * MIN);
    expect(doc.timeTakenMs).toBeLessThan(2 * MIN + 5_000);
  });
});

describe("startQuizAttempt", () => {
  const formId = oid();
  const perPerson = (o: Record<string, unknown> = {}) => quiz({ _id: formId, quizTimer: { mode: "per_person", durationMinutes: 10 }, ...o });

  it("is idempotent: Start again (refresh, second tab) returns the same deadline", async () => {
    const existing = { startedAt: new Date(Date.now() - MIN), endsAt: new Date(Date.now() + 9 * MIN) };
    m(Form.findOne).mockResolvedValue(perPerson());
    attemptIs(existing);
    const res = await startQuizAttempt(String(formId), "s1");
    expect(res.endsAt).toBe(existing.endsAt);
    expect(QuizAttempt.create).not.toHaveBeenCalled();
  });

  it("caps the personal deadline at the quiz's close time", async () => {
    const closesAt = new Date(Date.now() + 4 * MIN);
    m(Form.findOne).mockResolvedValue(perPerson({ expiresAt: closesAt }));
    attemptIs(null);
    m(FormResponse.exists).mockResolvedValue(null);
    m(QuizAttempt.create).mockImplementation(async (doc: any) => doc);
    const res = await startQuizAttempt(String(formId), "s1");
    expect(res.endsAt.getTime()).toBe(closesAt.getTime());
  });

  it("starts an untimed quiz with no deadline, or the quiz's close time", async () => {
    m(FormResponse.exists).mockResolvedValue(null);
    m(QuizAttempt.create).mockImplementation(async (doc: any) => doc);
    attemptIs(null);
    m(Form.findOne).mockResolvedValue(quiz({ _id: formId }));
    const open = await startQuizAttempt(String(formId), "s1");
    expect(open.endsAt).toBeNull();
    expect(open.startedAt.getTime()).toBeLessThanOrEqual(Date.now());

    const closesAt = new Date(Date.now() + 30 * MIN);
    m(Form.findOne).mockResolvedValue(quiz({ _id: formId, expiresAt: closesAt }));
    expect((await startQuizAttempt(String(formId), "s2")).endsAt?.getTime()).toBe(closesAt.getTime());
  });

  it("refuses a live quiz: it starts at the host's Start", async () => {
    m(Form.findOne).mockResolvedValue(quiz({ _id: formId, quizTimer: { mode: "live", durationMinutes: 5 } }));
    await expect(startQuizAttempt(String(formId), "s1")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("refuses someone who already submitted", async () => {
    m(Form.findOne).mockResolvedValue(perPerson());
    attemptIs(null);
    m(FormResponse.exists).mockResolvedValue({ _id: "r" });
    await expect(startQuizAttempt(String(formId), "s1")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns the winner when two Start presses race", async () => {
    const winner = { startedAt: new Date(), endsAt: new Date(Date.now() + 10 * MIN) };
    m(Form.findOne).mockResolvedValue(perPerson());
    m(QuizAttempt.findOne).mockReturnValueOnce({ lean: async () => null }).mockReturnValueOnce({ lean: async () => winner });
    m(FormResponse.exists).mockResolvedValue(null);
    m(QuizAttempt.create).mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
    const res = await startQuizAttempt(String(formId), "s1");
    expect(res.endsAt).toBe(winner.endsAt);
  });
});
