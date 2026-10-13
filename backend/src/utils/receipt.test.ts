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
    expect(html).toContain("Score: 3/5");
    expect(html).toContain('href="https://kollects.app/f/abc"');
  });

  it("only emails when there is an address", () => {
    const receipt = { kind: "poll" as const, title: "T", url: "u", rows: [] };
    sendSubmissionCopy(undefined, receipt, "k");
    expect(sendEmail).not.toHaveBeenCalled();
    sendSubmissionCopy("bob@test.local", receipt, "receipt-1");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "bob@test.local", subject: 'Your response to "T"', idempotencyKey: "receipt-1" }));
  });

  it("formats form answers as readable text", () => {
    const choice = { type: "checkboxes", options: [{ _id: "o1", text: "Red" }, { _id: "o2", text: "Blue" }] };
    expect(formatFormAnswer(choice, { selectedOptionIds: ["o2", "o1"] })).toBe("Blue; Red");
    expect(formatFormAnswer(choice, { skipped: true, selectedOptionIds: ["o1"] })).toBe("");
    expect(formatFormAnswer({ type: "short_text" }, { textValue: "hi" })).toBe("hi");
    expect(formatFormAnswer({ type: "linear_scale" }, { scaleValue: 4 })).toBe("4");
  });
});
