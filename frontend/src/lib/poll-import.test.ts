import { describe, it, expect } from "vitest";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { POLL_IMPORT_PROMPT, parsePollImport } from "./poll-import";

const base = () => usePollBuilderStore.getState().form;
const parse = (obj: unknown) => parsePollImport(JSON.stringify(obj), base());
const example = () => {
  const chunk = POLL_IMPORT_PROMPT.split("\nEXAMPLE\n")[1]!;
  return chunk.slice(0, chunk.indexOf("\n}\n") + 2);
};

describe("parsePollImport", () => {
  it("accepts the example shipped in the AI prompt", () => {
    const p = parsePollImport(example(), base());
    expect(p.title).toBe("Team Lunch Poll");
    expect(p.expiresAt).toBe("2030-01-31T12:00");
    expect(p.settings).toMatchObject({ randomizeOptions: true, showProgressBar: true });
    const [single, multi, open] = p.questions;
    expect(single).toMatchObject({ type: "single_choice", isMandatory: true });
    expect(single!.options.map((o) => o.text)).toEqual(["Indian", "Italian", "Mexican"]);
    expect(multi).toMatchObject({ type: "multiple_choice", isMandatory: false });
    expect(open).toMatchObject({ type: "open_ended", options: [] });
  });

  it("maps requireSignIn to sign-in mode", () => {
    expect(parse({ title: "Lunch", requireSignIn: true, questions: [{ type: "open_ended", text: "Why?" }] }).responseMode).toBe("authenticated");
  });

  it("rejects bad questions with readable errors", () => {
    expect(() => parse({ title: "Lunch", questions: [{ type: "single_choice", text: "Q", options: ["A"] }] })).toThrow(/at least 2/);
    expect(() => parse({ title: "Lunch", questions: [{ type: "open_ended", text: "Q", options: ["A", "B"] }] })).toThrow(/no "options"/);
    expect(() => parse({ title: "Lunch", questions: [{ type: "single_choice", text: "Q", options: ["A", "a"] }] })).toThrow(/unique/);
    expect(() => parse({ title: "x", questions: [{ type: "open_ended", text: "Q" }] })).toThrow(/3 characters/);
  });
});
