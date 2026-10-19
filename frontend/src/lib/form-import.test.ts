import { describe, it, expect } from "vitest";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { FORM_IMPORT_PROMPT, formatImportJson, parseFormImport } from "./form-import";

const base = () => useFormBuilderStore.getState().form;
const parse = (obj: unknown) => parseFormImport(JSON.stringify(obj), base());

/** Pull the JSON blocks that follow "EXAMPLE" headings out of the prompt. */
function promptExamples(): string[] {
  return FORM_IMPORT_PROMPT.split(/\n(?:QUIZ )?EXAMPLE[^\n]*\n/)
    .slice(1)
    .map((chunk) => chunk.slice(0, chunk.indexOf("\n}\n") + 2));
}

describe("parseFormImport", () => {
  it("accepts both examples shipped in the AI prompt", () => {
    const examples = promptExamples();
    expect(examples).toHaveLength(2);
    for (const ex of examples) expect(() => parseFormImport(ex, base())).not.toThrow();
  });

  it("maps sections, branching and settings", () => {
    const f = parseFormImport(promptExamples()[0]!, base());
    expect(f.sections).toHaveLength(2);
    expect(f.settings.collectEmail).toBe(true);
    expect(f.settings.showProgressBar).toBe(true); // default kept
    const [s1, s2] = f.sections;
    const attend = s1!.questions[1]!;
    expect(s1!.navigation).toEqual({ type: "byAnswer", questionId: attend.id });
    expect(attend.optionNavigation).toEqual({ [attend.options[0]!.id]: s2!.id, [attend.options[1]!.id]: "submit" });
    expect(s2!.questions[2]!.rows?.map((r) => r.label)).toEqual(["Lunch", "Dinner"]);
  });

  it("maps quiz answers by option text", () => {
    const f = parseFormImport(promptExamples()[1]!, base());
    expect(f.isQuiz).toBe(true);
    const [mc, cb, sa] = f.sections[0]!.questions;
    expect(mc!.answerKey?.correctOptionIds).toEqual([mc!.options[0]!.id]);
    expect(mc!.points).toBe(2);
    expect(cb!.answerKey?.correctOptionIds).toHaveLength(2);
    expect(sa!.answerKey).toEqual({ correctText: "Pacific", feedback: "The Pacific covers about a third of Earth." });
  });

  it("maps the quiz timer and close time; a live quiz ignores closesAt", () => {
    const f = parseFormImport(promptExamples()[1]!, base());
    expect(f.quizTimer).toEqual({ mode: "per_person", durationMinutes: 10 });
    const q = [{ type: "paragraph", title: "Why?" }];
    expect(parse({ title: "x", closesAt: "2099-01-31T18:30", questions: q }).expiresAt).toBe("2099-01-31T18:30");
    const live = parse({ title: "x", isQuiz: true, closesAt: "2099-01-31T18:30", quizTimer: { mode: "live", durationMinutes: 5 }, questions: q });
    expect(live.expiresAt).toBe("");
    expect(() => parse({ title: "x", closesAt: "2000-01-01T00:00", questions: q })).toThrow(/future/);
  });

  it("repairs AI-style double-escaped quotes and strips ``` fences", () => {
    // Raw text as AI chats emit it: \\" inside strings, wrapped in a json fence.
    const text = String.raw`${"```"}json
{ "title": "JS", "isQuiz": true, "questions": [
  { "type": "multiple_choice", "title": "What is 2 + \\"3\\"?", "options": ["5", "\\"23\\""], "correct": ["\\"23\\""] } ] }
${"```"}`;
    const q = parseFormImport(text, base()).sections[0]!.questions[0]!;
    expect(q.title).toBe('What is 2 + "3"?');
    expect(q.answerKey?.correctOptionIds).toEqual([q.options[1]!.id]);
  });

  it("pretty-prints minified, double-escaped AI output for the editor", () => {
    const pretty = formatImportJson(String.raw`{"title":"JS \\"quiz\\"","questions":[{"type":"paragraph","title":"Why?"}]}`);
    expect(pretty.split("\n").length).toBeGreaterThan(5);
    expect(JSON.parse(pretty).title).toBe('JS "quiz"');
    expect(() => formatImportJson("{ nope")).toThrow(/valid JSON/);
  });

  it("rejects bad input with readable errors", () => {
    expect(() => parseFormImport('{\n  "title": "x",\n  "questions": [ nope ]\n}', base())).toThrow(/valid JSON[\s\S]*nope/);
    // Position-style errors (e.g. a stray quote) get a line number + snippet.
    expect(() => parseFormImport('{\n  "title": "a"b"\n}', base())).toThrow(/Near line 2/);
    expect(() => parse({ title: "x" })).toThrow(/sections/);
    expect(() => parse({ title: "x", questions: [{ type: "dropdown", title: "Q" }] })).toThrow(/needs an "options"/);
    expect(() =>
      parse({ title: "x", isQuiz: true, questions: [{ type: "multiple_choice", title: "Q", options: ["A"], correct: ["B"] }] })
    ).toThrow(/not one of its options/);
    expect(() =>
      parse({ title: "x", sections: [{ questions: [{ type: "dropdown", title: "Q", options: [{ text: "A", goTo: 1 }] }] }] })
    ).toThrow(/another section/);
  });
});
