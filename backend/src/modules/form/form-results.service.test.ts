import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

vi.mock("./form.model.js", () => ({ Form: { updateOne: vi.fn() } }));
vi.mock("../form-response/form-response.model.js", () => ({ FormResponse: {} }));
vi.mock("../../socket/index.js", () => ({ emitFormStatusChange: vi.fn() }));

import { Form } from "./form.model.js";
import { emitFormStatusChange } from "../../socket/index.js";
import { assignRanks, buildReview, maxPointsOf, settleExpiredForm, SUBMIT_GRACE_MS } from "./form-results.service.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const oid = () => new mongoose.Types.ObjectId();

describe("assignRanks", () => {
  it("uses competition ranking: ties share a rank and the next rank skips", () => {
    const ranked = assignRanks([{ score: 9 }, { score: 7 }, { score: 7 }, { score: 4 }]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("handles an empty board", () => {
    expect(assignRanks([])).toEqual([]);
  });
});

describe("buildReview / maxPointsOf", () => {
  const [a, b, c] = [oid(), oid(), oid()];
  const mc = { _id: oid(), order: 1, type: "multiple_choice", title: "Capital?", points: 2,
    options: [{ _id: a, text: "Paris" }, { _id: b, text: "Rome" }], answerKey: { correctOptionIds: [String(a)], feedback: "Paris!" } };
  const sa = { _id: oid(), order: 0, type: "short_answer", title: "Ocean?", points: 1, answerKey: { correctText: "Pacific" } };
  const essay = { _id: oid(), order: 2, type: "paragraph", title: "Why?", points: 5 };
  const unscored = { _id: oid(), order: 3, type: "checkboxes", title: "Pick", points: 0, options: [{ _id: c, text: "X" }] };
  const form = { sections: [{ order: 0, questions: [mc, sa, essay, unscored] }] };

  it("counts only gradable points in the max (a paragraph's points can never be earned)", () => {
    expect(maxPointsOf(form)).toBe(3);
  });

  it("lists scored questions in display order with picked vs. correct answers", () => {
    const review = buildReview(form, {
      answers: [
        { questionId: mc._id, selectedOptionIds: [String(b)], isCorrect: false, pointsEarned: 0 },
        { questionId: sa._id, textValue: "Pacific", isCorrect: true, pointsEarned: 1 },
      ],
    });
    expect(review.map((r) => r.title)).toEqual(["Ocean?", "Capital?"]);
    expect(review[1]).toMatchObject({ yourAnswer: ["Rome"], correctAnswer: ["Paris"], isCorrect: false, points: 2, feedback: "Paris!" });
    expect(review[0]).toMatchObject({ yourAnswer: ["Pacific"], correctAnswer: ["Pacific"], pointsEarned: 1 });
  });

  it("shows an unanswered question as empty", () => {
    expect(buildReview(form, { answers: [] })[1]!.yourAnswer).toEqual([]);
  });
});

describe("settleExpiredForm", () => {
  const now = new Date("2026-10-18T10:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  beforeEach(() => {
    vi.clearAllMocks();
    m(Form.updateOne).mockResolvedValue({ modifiedCount: 1 });
  });

  it("leaves a form alone inside the grace window", async () => {
    const form = { _id: oid(), status: "active", expiresAt: ago(SUBMIT_GRACE_MS - 1000) };
    await settleExpiredForm(form, now);
    expect(form.status).toBe("active");
    expect(Form.updateOne).not.toHaveBeenCalled();
  });

  it("closes a plain form past its deadline", async () => {
    const form = { _id: oid(), status: "active", expiresAt: ago(SUBMIT_GRACE_MS + 1000), isQuiz: false };
    await settleExpiredForm(form, now);
    expect(form.status).toBe("closed");
    expect(emitFormStatusChange).toHaveBeenCalledWith(String(form._id), expect.objectContaining({ status: "closed", reason: "expired" }));
  });

  it("publishes an auto-publish quiz's results when its timer ends", async () => {
    const form: Record<string, any> = {
      _id: oid(), status: "active", expiresAt: ago(SUBMIT_GRACE_MS + 1000), isQuiz: true, settings: { autoPublishResults: true },
    };
    await settleExpiredForm(form, now);
    expect(form).toMatchObject({ status: "published", isResultsPublic: true, resultsPublishedAt: now });
    expect(m(Form.updateOne).mock.calls[0]![0]).toEqual({ _id: form._id, status: "active" });
  });

  it("does not re-broadcast when another caller already settled it", async () => {
    m(Form.updateOne).mockResolvedValue({ modifiedCount: 0 });
    await settleExpiredForm({ _id: oid(), status: "active", expiresAt: ago(60_000) }, now);
    expect(emitFormStatusChange).not.toHaveBeenCalled();
  });
});
