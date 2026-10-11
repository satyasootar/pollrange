import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

// Mock the models + socket so submitResponse runs without a DB.
vi.mock("../form/form.model.js", () => ({ Form: { findOne: vi.fn(), updateOne: vi.fn(), findById: vi.fn() } }));
vi.mock("./form-response.model.js", () => ({ FormResponse: { findOne: vi.fn(), create: vi.fn(), updateOne: vi.fn() } }));
vi.mock("../../socket/index.js", () => ({ emitFormAnalyticsUpdate: vi.fn() }));
vi.mock("../billing/billing.service.js", () => ({ consume: vi.fn(), refund: vi.fn() }));

import { Form } from "../form/form.model.js";
import { FormResponse } from "./form-response.model.js";
import { submitResponse } from "./form-response.service.js";
import { consume, refund } from "../billing/billing.service.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const oid = () => new mongoose.Types.ObjectId().toString();

const qId = oid();
const [coding, ai, free] = [oid(), oid(), oid()];

function paidForm(payment: Record<string, unknown> = {}) {
  return {
    _id: oid(),
    creatorId: "creator1",
    status: "active",
    responseMode: "anonymous",
    settings: {},
    isQuiz: false,
    sections: [
      {
        questions: [
          {
            _id: new mongoose.Types.ObjectId(qId),
            type: "checkboxes",
            title: "Activities",
            isRequired: true,
            options: [
              { _id: coding, text: "Coding", amount: 100 },
              { _id: ai, text: "AI", amount: 250.5 },
              { _id: free, text: "Networking" },
            ],
            payment: { enabled: true, upiId: "host@okaxis", messageTemplate: "Ref {form_response_id} - {selected_options}", ...payment },
          },
        ],
      },
    ],
  };
}

const answer = (ids: string[]) => ({
  sessionToken: "s1",
  isComplete: true,
  answers: [{ questionId: qId, selectedOptionIds: ids, skipped: ids.length === 0, gridValues: [], fileUrls: [] }],
});
const meta = { ipHash: "h", userAgent: "ua" };

beforeEach(() => {
  vi.clearAllMocks();
  m(FormResponse.findOne).mockResolvedValue(null);
  m(FormResponse.create).mockImplementation(async (doc: any) => ({ ...doc, isComplete: true }));
  m(Form.updateOne).mockResolvedValue({});
  m(Form.findById).mockReturnValue({ select: vi.fn().mockResolvedValue({ totalResponses: 1 }) });
});

describe("submitResponse payment", () => {
  it("stores the payment in one write, with the real response id in the note, and returns the amount due", async () => {
    m(Form.findOne).mockResolvedValue(paidForm());
    const result = await submitResponse("f1", answer([coding, ai]) as any, meta);

    const doc = m(FormResponse.create).mock.calls[0]![0];
    expect(doc.payment.totalAmount).toBe(350.5);
    expect(doc.payment.message).toBe(`Ref ${doc._id.toString()} - Coding, AI`);
    expect(FormResponse.updateOne).not.toHaveBeenCalled();
    expect(result.payment).toEqual({
      totalAmount: 350.5,
      selectedOptions: ["Coding", "AI"],
      message: doc.payment.message,
      upiId: "host@okaxis",
    });
  });

  it("returns no payment when only free options are picked", async () => {
    m(Form.findOne).mockResolvedValue(paidForm());
    const result = await submitResponse("f1", answer([free]) as any, meta);
    expect(result.payment).toBeUndefined();
  });

  it("rejects selections outside min/max with a readable message", async () => {
    m(Form.findOne).mockResolvedValue(paidForm({ minSelections: 2, maxSelections: 2 }));
    await expect(submitResponse("f1", answer([coding]) as any, meta)).rejects.toThrow(/at least 2/);
    await expect(submitResponse("f1", answer([coding, ai, free]) as any, meta)).rejects.toThrow(/at most 2/);
    expect(FormResponse.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate and unknown option ids", async () => {
    m(Form.findOne).mockResolvedValue(paidForm());
    await expect(submitResponse("f1", answer([coding, coding]) as any, meta)).rejects.toThrow(/Duplicate/);
    await expect(submitResponse("f1", answer([oid()]) as any, meta)).rejects.toThrow(/Invalid payment/);
  });

  it("charges the creator's response quota once, after validation, and refunds a failed insert", async () => {
    m(Form.findOne).mockResolvedValue(paidForm());
    await submitResponse("f1", answer([coding]) as any, meta);
    expect(consume).toHaveBeenCalledWith("creator1", "responses", "respondent");
    expect(refund).not.toHaveBeenCalled();

    vi.clearAllMocks();
    m(FormResponse.findOne).mockResolvedValue(null);
    m(FormResponse.create).mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
    await expect(submitResponse("f1", answer([coding]) as any, meta)).rejects.toThrow(/already submitted/);
    expect(refund).toHaveBeenCalledWith("creator1", "responses");
  });

  it("does not charge quota for submissions rejected by validation", async () => {
    m(Form.findOne).mockResolvedValue(paidForm({ minSelections: 2 }));
    await expect(submitResponse("f1", answer([coding]) as any, meta)).rejects.toThrow();
    expect(consume).not.toHaveBeenCalled();
  });
});
