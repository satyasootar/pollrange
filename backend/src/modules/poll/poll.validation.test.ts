import { describe, it, expect } from "vitest";
import {
  createPollSchema,
  updatePollSchema,
  publishPollSchema,
  reopenPollSchema,
} from "./poll.validation.js";

const validPollInput = {
  title: "Favorite language",
  description: "Pick one",
  responseMode: "anonymous" as const,
  questions: [
    {
      text: "Which do you prefer?",
      type: "single_choice" as const,
      order: 0,
      options: [
        { text: "TypeScript", order: 0 },
        { text: "JavaScript", order: 1 },
      ],
    },
  ],
};

describe("createPollSchema", () => {
  it("accepts a valid poll payload", () => {
    const result = createPollSchema.safeParse(validPollInput);
    expect(result.success).toBe(true);
  });

  it("rejects a title shorter than 3 characters", () => {
    const result = createPollSchema.safeParse({ ...validPollInput, title: "ab" });
    expect(result.success).toBe(false);
  });

  it("requires at least one question", () => {
    const result = createPollSchema.safeParse({ ...validPollInput, questions: [] });
    expect(result.success).toBe(false);
  });

  it("strips server-controlled fields (mass-assignment protection)", () => {
    const parsed = createPollSchema.parse({
      ...validPollInput,
      status: "published",
      totalResponses: 9999,
      creatorId: "507f1f77bcf86cd799439011",
      shareToken: "attacker-controlled",
      isDeleted: true,
    });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("totalResponses");
    expect(parsed).not.toHaveProperty("creatorId");
    expect(parsed).not.toHaveProperty("shareToken");
    expect(parsed).not.toHaveProperty("isDeleted");
  });

  it("drops client-supplied voteCount on options", () => {
    const parsed = createPollSchema.parse({
      ...validPollInput,
      questions: [
        {
          ...validPollInput.questions[0],
          options: [{ text: "TypeScript", order: 0, voteCount: 500 }],
        },
      ],
    });
    expect(parsed.questions[0]!.options![0]).not.toHaveProperty("voteCount");
  });

  it("coerces an ISO date string into a Date for expiresAt", () => {
    const parsed = createPollSchema.parse({
      ...validPollInput,
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(parsed.expiresAt).toBeInstanceOf(Date);
  });

  it("defaults question type to single_choice and isMandatory to true", () => {
    const parsed = createPollSchema.parse({
      ...validPollInput,
      questions: [{ text: "Q", order: 0, options: [{ text: "a", order: 0 }] }],
    });
    expect(parsed.questions[0]!.type).toBe("single_choice");
    expect(parsed.questions[0]!.isMandatory).toBe(true);
  });
});

describe("updatePollSchema", () => {
  it("allows a partial payload (e.g. title only)", () => {
    const result = updatePollSchema.safeParse({ title: "New title" });
    expect(result.success).toBe(true);
  });

  it("still validates provided fields (short title rejected)", () => {
    const result = updatePollSchema.safeParse({ title: "x" });
    expect(result.success).toBe(false);
  });

  it("does not surface server-controlled fields", () => {
    const parsed = updatePollSchema.parse({ title: "New", status: "closed" });
    expect(parsed).not.toHaveProperty("status");
  });
});

describe("reopenPollSchema", () => {
  it("treats an absent expiresAt as forever (undefined)", () => {
    const parsed = reopenPollSchema.parse({});
    expect(parsed.expiresAt).toBeUndefined();
  });

  it("accepts null for forever", () => {
    const parsed = reopenPollSchema.parse({ expiresAt: null });
    expect(parsed.expiresAt).toBeNull();
  });

  it("coerces an ISO string into a Date deadline", () => {
    const parsed = reopenPollSchema.parse({ expiresAt: "2030-06-01T12:00:00.000Z" });
    expect(parsed.expiresAt).toBeInstanceOf(Date);
  });

  it("rejects a non-date string", () => {
    expect(reopenPollSchema.safeParse({ expiresAt: "whenever" }).success).toBe(false);
  });
});

describe("publishPollSchema", () => {
  it("defaults mode to permanent", () => {
    expect(publishPollSchema.parse({}).mode).toBe("permanent");
  });

  it("rejects an unknown mode", () => {
    expect(publishPollSchema.safeParse({ mode: "forever" }).success).toBe(false);
  });
});
