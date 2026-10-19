import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

vi.mock("./form.model.js", () => ({ Form: { findOne: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn(), findById: vi.fn() } }));
vi.mock("../form-response/form-response.model.js", () => ({ FormResponse: { exists: vi.fn() } }));
vi.mock("../form-response/quiz-attempt.model.js", () => ({ QuizAttempt: { findOne: vi.fn() } }));
vi.mock("../../socket/index.js", () => ({ emitFormStatusChange: vi.fn(), emitQuizLiveState: vi.fn() }));
vi.mock("../billing/billing.service.js", () => ({ assertFeature: vi.fn(), assertLiveCapacity: vi.fn(), hasFeature: vi.fn() }));
vi.mock("../branding/branding.service.js", () => ({ resolveBrand: vi.fn() }));

import { Form } from "./form.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { emitQuizLiveState } from "../../socket/index.js";
import { endLiveQuiz, extendLiveQuiz, startLiveQuiz, updateForm } from "./form.service.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const id = new mongoose.Types.ObjectId();
const liveQuiz = (o: Record<string, unknown> = {}) => ({
  _id: id,
  isQuiz: true,
  status: "active",
  quizTimer: { mode: "live", durationMinutes: 20 },
  settings: {},
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  m(Form.updateOne).mockResolvedValue({ modifiedCount: 1 });
});

describe("startLiveQuiz", () => {
  it("starts one shared timer and pushes it to every taker", async () => {
    m(Form.findOne).mockResolvedValue(liveQuiz());
    m(Form.findOneAndUpdate).mockImplementation(async (_f: unknown, update: any) => ({ _id: id, ...update.$set }));
    const before = Date.now();
    await startLiveQuiz("u", String(id), 10);

    const [filter, update] = m(Form.findOneAndUpdate).mock.calls[0]!;
    // Conditional: a double click (or a second host tab) can only start it once.
    expect(filter).toMatchObject({ status: "active", liveStartedAt: null });
    const { liveStartedAt, expiresAt } = (update as any).$set;
    expect(expiresAt.getTime() - liveStartedAt.getTime()).toBe(10 * 60_000);
    expect(liveStartedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(emitQuizLiveState).toHaveBeenCalledWith(String(id), expect.objectContaining({ state: "running", endsAt: expiresAt }));
  });

  it("uses the configured length when none is given", async () => {
    m(Form.findOne).mockResolvedValue(liveQuiz());
    m(Form.findOneAndUpdate).mockImplementation(async (_f: unknown, update: any) => ({ _id: id, ...update.$set }));
    await startLiveQuiz("u", String(id));
    const { liveStartedAt, expiresAt } = (m(Form.findOneAndUpdate).mock.calls[0]![1] as any).$set;
    expect(expiresAt.getTime() - liveStartedAt.getTime()).toBe(20 * 60_000);
  });

  it.each([
    ["it already started", liveQuiz({ liveStartedAt: new Date() }), 409],
    ["it isn't a live quiz", liveQuiz({ quizTimer: { mode: "per_person", durationMinutes: 5 } }), 400],
    ["it's closed", liveQuiz({ status: "closed" }), 400],
  ])("refuses when %s", async (_label, doc, code) => {
    m(Form.findOne).mockResolvedValue(doc);
    await expect(startLiveQuiz("u", String(id))).rejects.toMatchObject({ statusCode: code });
    expect(emitQuizLiveState).not.toHaveBeenCalled();
  });
});

describe("extendLiveQuiz / endLiveQuiz", () => {
  it("adds time with an atomic update and pushes the new end", async () => {
    const endsAt = new Date(Date.now() + 60_000);
    m(Form.findOne).mockResolvedValue(liveQuiz({ liveStartedAt: new Date(), expiresAt: endsAt }));
    m(Form.findOneAndUpdate).mockResolvedValue({ _id: id, liveStartedAt: new Date(), expiresAt: new Date(endsAt.getTime() + 5 * 60_000) });
    await extendLiveQuiz("u", String(id), 5);
    const [filter, update] = m(Form.findOneAndUpdate).mock.calls[0]!;
    expect(filter).toMatchObject({ status: "active", liveStartedAt: { $ne: null } });
    expect(update).toEqual([{ $set: { expiresAt: { $add: ["$expiresAt", 5 * 60_000] } } }]);
    expect(emitQuizLiveState).toHaveBeenCalledWith(String(id), expect.objectContaining({ state: "running" }));
  });

  it("ends now but keeps the quiz open through the submit grace so in-flight answers land", async () => {
    vi.useFakeTimers();
    m(Form.findOne).mockResolvedValue(liveQuiz({ liveStartedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) }));
    m(Form.findOneAndUpdate).mockImplementation(async (_f: unknown, update: any) => ({ _id: id, ...update.$set }));
    await endLiveQuiz("u", String(id));
    const { expiresAt } = (m(Form.findOneAndUpdate).mock.calls[0]![1] as any).$set;
    expect(Math.abs(expiresAt.getTime() - Date.now())).toBeLessThan(1000);
    expect(emitQuizLiveState).toHaveBeenCalledWith(String(id), expect.objectContaining({ state: "ended" }));
    // Nothing closed yet: the status change waits for the grace period.
    expect(Form.updateOne).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("refuses to end a quiz that never started", async () => {
    m(Form.findOne).mockResolvedValue(liveQuiz());
    await expect(endLiveQuiz("u", String(id))).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("updateForm with a live quiz", () => {
  const current = (doc: unknown) => m(Form.findOne).mockReturnValue({ select: () => ({ lean: async () => doc }) });

  it("is locked once the host has started it", async () => {
    current({ status: "active", totalResponses: 0, quizTimer: { mode: "live" }, liveStartedAt: new Date() });
    await expect(updateForm("u", String(id), { title: "x" })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("never lets an editor save overwrite the host-owned end time", async () => {
    current({ status: "active", totalResponses: 0, shareToken: "t", quizTimer: { mode: "live" } });
    m(FormResponse.exists).mockResolvedValue(null);
    m(Form.findOneAndUpdate).mockResolvedValue({ _id: id });
    await updateForm("u", String(id), { title: "x", expiresAt: new Date(Date.now() + 1e6) });
    const update = m(Form.findOneAndUpdate).mock.calls[0]![1] as any;
    expect(update.$set.expiresAt).toBeUndefined();
    expect(update.$unset).toEqual({ expiresAt: 1 });
  });
});
