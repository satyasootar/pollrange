import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionSummaryCard } from "./question-summary-card";
import type { FormQuestionSummary } from "@/types";

const choice: FormQuestionSummary = {
  questionId: "q1",
  title: "Capital of France?",
  type: "multiple_choice",
  responseCount: 4,
  options: [
    { optionId: "a", text: "Paris", count: 3, percentage: 75 },
    { optionId: "b", text: "Rome", count: 1, percentage: 25 },
  ],
};

describe("QuestionSummaryCard (quiz)", () => {
  it("marks the correct option and shows how many got it right", () => {
    render(<QuestionSummaryCard q={choice} answerKey={{ correctOptionIds: ["a"] }} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText(/got it right/i)).toBeInTheDocument();
    expect(screen.getAllByText(/correct/i)).toHaveLength(1);
    expect(screen.getByText("Paris").parentElement).toHaveTextContent("Correct");
  });

  it("grades typed answers the way the server does (trimmed, any case)", () => {
    const text: FormQuestionSummary = { questionId: "q2", title: "Largest ocean?", type: "short_answer", responseCount: 3, values: [" pacific", "Atlantic", "PACIFIC"] };
    render(<QuestionSummaryCard q={text} answerKey={{ correctText: "Pacific" }} />);
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("Pacific")).toBeInTheDocument();
  });

  it("shows plain results for a normal form", () => {
    render(<QuestionSummaryCard q={choice} />);
    expect(screen.queryByText(/got it right/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/correct/i)).not.toBeInTheDocument();
  });
});
