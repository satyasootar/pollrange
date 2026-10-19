import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmail = vi.fn();
vi.mock("./mail.js", () => ({ sendEmail }));

const { receiptHtml, sendSubmissionCopy } = await import("./receipt.js");
const { formatFormAnswer } = await import("../modules/form-analytics/form-analytics.service.js");

describe("submission receipt", () => {
  beforeEach(() => sendEmail.mockReset().mockResolvedValue({ success: true }));

  it("lists each question with the respondent's answer, escaped", () => {
    const html = receiptHtml({
      kind: "form",
      title: "Feedback <b>",
      url: "https://kollects.app/f/abc",
      name: "Bob",
      notes: ["Score: 3/5"],
      rows: [
        { question: "Favourite?", answer: "Pizza & <script>" },
        { question: "Skipped one", answer: "" },
      ],
    });
    expect(html).toContain("Favourite?");
    expect(html).toContain("Pizza &amp; &lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Feedback &lt;b&gt;");
    expect(html).toContain("No answer");
    expect(html).toMatch(/Score<\/div><div[^>]*>3\/5/);
    expect(html).toContain('href="https://kollects.app/f/abc"');
    expect(html).toContain("#6366f1"); // Kollects' own accent without a brand
  });

  it("themes the email with the creator's brand and the form's cover image", () => {
    const html = receiptHtml(
      { kind: "form", title: "T", url: "u", rows: [{ question: "Q", answer: "A" }], bannerUrl: "https://img.test/cover.png" },
      {
        companyName: "Acme <Co>", logoUrl: "https://img.test/logo.png", accentColor: "#059669", font: "lora",
        radius: "round", background: "tint", website: "https://acme.test", supportEmail: "help@acme.test",
      }
    );
    expect(html).toContain("background:#059669"); // button + stripe in the brand accent
    expect(html).toContain('src="https://img.test/logo.png"');
    expect(html).toContain('src="https://img.test/cover.png"');
    expect(html).toContain("Lora,Georgia,serif");
    expect(html).toContain("border-radius:16px");
    expect(html).toContain("Acme &lt;Co&gt;");
    expect(html).toContain("mailto:help@acme.test");
  });

  it("sends the branded copy with a text version, and falls back to the default look if the brand can't load", async () => {
    const model = { updateOne: vi.fn().mockResolvedValue({}) };
    const receipt = { kind: "form" as const, title: "T", url: "u", rows: [{ question: "Q", answer: "A" }], loadBrand: () => Promise.reject(new Error("db down")) };
    const sent = await sendSubmissionCopy("bob@test.local", receipt, { model, id: "r3" }, "auto");
    expect(sent?.status).toBe("sent");
    const mail = sendEmail.mock.calls[0]![0];
    expect(mail.html).toContain("#6366f1");
    expect(mail.text).toContain("Q\n  A");
  });

  it("only emails when there is an address, and records the outcome on the response", async () => {
    const receipt = { kind: "poll" as const, title: "T", url: "u", rows: [] };
    const model = { updateOne: vi.fn().mockResolvedValue({}) };
    expect(await sendSubmissionCopy(undefined, receipt, { model, id: "r1" }, "auto")).toBeNull();
    expect(sendEmail).not.toHaveBeenCalled();

    const sent = await sendSubmissionCopy("bob@test.local", receipt, { model, id: "r1" }, "auto");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "bob@test.local", subject: 'Your response to "T"', idempotencyKey: "receipt-r1" }));
    expect(sent).toMatchObject({ status: "sent", to: "bob@test.local", trigger: "auto" });
    // Latest outcome plus an appended, capped history entry.
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: "r1" },
      { $set: { receipt: sent }, $push: { receiptHistory: { $each: [sent], $slice: -20 } } }
    );
  });

  it("records a failure instead of throwing when the email can't be sent", async () => {
    sendEmail.mockResolvedValueOnce({ success: false, error: "domain not verified" });
    const model = { updateOne: vi.fn().mockResolvedValue({}) };
    const res = await sendSubmissionCopy("bob@test.local", { kind: "form", title: "T", url: "u", rows: [] }, { model, id: "r2" }, "manual");
    expect(res).toMatchObject({ status: "failed", error: "domain not verified", trigger: "manual" });
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: "r2" },
      expect.objectContaining({ $set: { receipt: res }, $push: { receiptHistory: { $each: [res], $slice: -20 } } })
    );
    // No idempotency key on manual resends, so a retry isn't swallowed as a duplicate.
    expect(sendEmail.mock.calls[0]![0]).not.toHaveProperty("idempotencyKey");
  });

  it("formats form answers as readable text", () => {
    const choice = { type: "checkboxes", options: [{ _id: "o1", text: "Red" }, { _id: "o2", text: "Blue" }] };
    expect(formatFormAnswer(choice, { selectedOptionIds: ["o2", "o1"] })).toBe("Blue; Red");
    expect(formatFormAnswer(choice, { skipped: true, selectedOptionIds: ["o1"] })).toBe("");
    expect(formatFormAnswer({ type: "short_text" }, { textValue: "hi" })).toBe("hi");
    expect(formatFormAnswer({ type: "linear_scale" }, { scaleValue: 4 })).toBe("4");
  });
});
