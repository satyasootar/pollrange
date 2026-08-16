import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicPollPage } from "./poll";
import { renderAtRoute } from "@/test/utils";
import { testState } from "@/test/msw/handlers";
import { makePublicPoll, makePublicPollQuestion } from "@/test/msw/factories";

const renderPage = () => renderAtRoute(<PublicPollPage />, { path: "/p/:shareToken", route: "/p/tok123" });

describe("PublicPollPage", () => {
  it("keeps submit disabled until a mandatory question is answered, then submits", async () => {
    testState.publicPoll = makePublicPoll({
      questions: [
        makePublicPollQuestion({
          isMandatory: true,
          text: "Favourite colour?",
          options: [
            { optionId: "red", text: "Red", order: 0 },
            { optionId: "blue", text: "Blue", order: 1 },
          ],
        }),
      ],
    });
    renderPage();

    await screen.findByText("Favourite colour?");
    const submit = screen.getByRole("button", { name: /submit response/i });
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getByText("Red"));
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
    expect(testState.submittedPoll!.answers[0].selectedOptionId).toBe("red");
    expect(testState.submittedPoll!.isComplete).toBe(true);
  });

  it("supports multiple_choice selecting several options", async () => {
    testState.publicPoll = makePublicPoll({
      questions: [
        makePublicPollQuestion({
          type: "multiple_choice",
          isMandatory: true,
          text: "Which do you like?",
          options: [
            { optionId: "a", text: "Apples", order: 0 },
            { optionId: "b", text: "Bananas", order: 1 },
          ],
        }),
      ],
    });
    renderPage();
    await screen.findByText("Which do you like?");
    await userEvent.click(screen.getByText("Apples"));
    await userEvent.click(screen.getByText("Bananas"));
    await userEvent.click(screen.getByRole("button", { name: /submit response/i }));

    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
    expect(testState.submittedPoll!.answers[0].selectedOptionIds).toEqual(["a", "b"]);
  });

  it("shows the closed screen and no submit button for a closed poll", async () => {
    testState.publicPoll = makePublicPoll({ status: "closed" });
    renderPage();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /submit response/i })).not.toBeInTheDocument()
    );
    expect(screen.queryByText("Favourite colour?")).not.toBeInTheDocument();
  });

  it("shows the already-responded screen", async () => {
    testState.publicPoll = makePublicPoll({ alreadyResponded: true });
    renderPage();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /submit response/i })).not.toBeInTheDocument()
    );
    expect(testState.submittedPoll).toBeNull();
  });
});
