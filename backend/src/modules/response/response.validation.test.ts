import { describe, it, expect } from "vitest";
import { submitResponseSchema } from "./response.validation.js";
import mongoose from "mongoose";

const oid = () => new mongoose.Types.ObjectId();

const validAnswer = () => ({
  questionId: oid(),
  selectedOptionId: oid(),
  skipped: false,
});

describe("submitResponseSchema", () => {
  it("accepts a valid submission", () => {
    const result = submitResponseSchema.safeParse({
      sessionToken: "sess-123",
      answers: [validAnswer()],
      isComplete: true,
    });
    expect(result.success).toBe(true);
  });

  it("requires a non-empty sessionToken", () => {
    const result = submitResponseSchema.safeParse({
      sessionToken: "",
      answers: [validAnswer()],
      isComplete: true,
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one answer", () => {
    const result = submitResponseSchema.safeParse({
      sessionToken: "sess-123",
      answers: [],
      isComplete: true,
    });
    expect(result.success).toBe(false);
  });

  it("defaults isComplete to true when omitted", () => {
    const parsed = submitResponseSchema.parse({
      sessionToken: "sess-123",
      answers: [validAnswer()],
    });
    expect(parsed.isComplete).toBe(true);
  });

  it("defaults selectedOptionIds to an empty array", () => {
    const parsed = submitResponseSchema.parse({
      sessionToken: "sess-123",
      answers: [{ questionId: oid(), skipped: true }],
    });
    expect(parsed.answers[0]!.selectedOptionIds).toEqual([]);
  });
});
