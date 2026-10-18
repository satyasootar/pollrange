import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./form.model.js", () => ({ Form: { findOne: vi.fn(), findOneAndUpdate: vi.fn() } }));
vi.mock("../form-response/form-response.model.js", () => ({ FormResponse: { exists: vi.fn() } }));
vi.mock("../../socket/index.js", () => ({ emitFormStatusChange: vi.fn() }));
vi.mock("../billing/billing.service.js", () => ({ assertFeature: vi.fn(), assertLiveCapacity: vi.fn(), hasFeature: vi.fn() }));
vi.mock("../branding/branding.service.js", () => ({ resolveBrand: vi.fn() }));

import { Form } from "./form.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { updateForm } from "./form.service.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
/** Form.findOne(...).select(...).lean() resolving to `doc`. */
const current = (doc: unknown) => m(Form.findOne).mockReturnValue({ select: () => ({ lean: async () => doc }) });

describe("updateForm lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m(FormResponse.exists).mockResolvedValue(null);
  });

  it("edits a form nobody has responded to", async () => {
    current({ status: "active", totalResponses: 0, shareToken: "t" });
    m(Form.findOneAndUpdate).mockResolvedValue({ _id: "f", title: "New" });
    await expect(updateForm("u", "f", { title: "New" })).resolves.toMatchObject({ title: "New" });
    // The write itself re-checks the lock so a response landing mid-edit can't slip through.
    expect(m(Form.findOneAndUpdate).mock.calls[0]![0]).toMatchObject({ totalResponses: 0, status: { $ne: "published" } });
  });

  it.each([
    ["it has responses", { status: "active", totalResponses: 3 }],
    ["quiz results are published", { status: "published", totalResponses: 0 }],
  ])("refuses once %s", async (_label, doc) => {
    current(doc);
    await expect(updateForm("u", "f", { title: "x" })).rejects.toMatchObject({ statusCode: 409 });
    expect(Form.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("refuses when a response is saved but not yet counted", async () => {
    current({ status: "active", totalResponses: 0 });
    m(FormResponse.exists).mockResolvedValue({ _id: "r" });
    await expect(updateForm("u", "f", { title: "x" })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns 404 for someone else's form", async () => {
    current(null);
    await expect(updateForm("u", "f", { title: "x" })).rejects.toMatchObject({ statusCode: 404 });
  });
});
