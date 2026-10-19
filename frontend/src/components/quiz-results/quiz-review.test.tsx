import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizReview } from "./quiz-review";
import type { QuizReviewItem } from "@/types";

const q = (n: number, isCorrect: boolean): QuizReviewItem => ({
  questionId: `q${n}`,
  title: `Question text ${n}`,
  points: 1,
  pointsEarned: isCorrect ? 1 : 0,
  isCorrect,
  yourAnswer: [isCorrect ? "Right" : "Wrong"],
  correctAnswer: ["Right"],
});
const items = [q(1, true), q(2, false), q(3, true), q(4, false)];

describe("QuizReview", () => {
  it("opens on the first mistake and steps through every question", async () => {
    render(<QuizReview items={items} />);
    expect(screen.getByRole("heading", { name: "Question text 2" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^next/i }));
    expect(screen.getByRole("heading", { name: "Question text 3" })).toBeInTheDocument();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("heading", { name: "Question text 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  it("mistakes only: skips correct questions and jumps from the navigator", async () => {
    render(<QuizReview items={items} />);
    await userEvent.click(screen.getByRole("switch", { name: /mistakes only/i }));
    await userEvent.click(screen.getByRole("button", { name: /next mistake/i }));
    expect(screen.getByRole("heading", { name: "Question text 4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next mistake/i })).toBeDisabled();
    // Picking a correct question from the navigator turns the filter off.
    await userEvent.click(screen.getByRole("button", { name: "Question 1: correct" }));
    expect(screen.getByRole("heading", { name: "Question text 1" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /mistakes only/i })).not.toBeChecked();
  });
});
