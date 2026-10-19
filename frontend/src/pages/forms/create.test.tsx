import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateFormPage } from "./create";
import { renderAtRoute } from "@/test/utils";
import { useFormBuilderStore } from "@/store/use-form-builder-store";

const json = JSON.stringify({
  title: "Geography Quiz",
  isQuiz: true,
  quizTimer: { mode: "per_person", durationMinutes: 10 },
  questions: [
    { type: "multiple_choice", title: "Capital of France?", options: ["Paris", "Rome"], correct: ["Paris"] },
    { type: "short_answer", title: "Largest ocean?", correctText: "Pacific" },
  ],
});
const titles = () => useFormBuilderStore.getState().form.sections.flatMap((s) => s.questions.map((q) => q.title));
const open = () => renderAtRoute(<CreateFormPage />, { path: "/forms/create", route: "/forms/create" });

async function importJson() {
  await userEvent.click(screen.getByRole("button", { name: /import json/i }));
  fireEvent.change(screen.getByLabelText(/paste json/i), { target: { value: json } });
  await userEvent.click(screen.getByRole("button", { name: /^import$/i }));
}

describe("CreateFormPage JSON import", () => {
  beforeEach(() => useFormBuilderStore.getState().reset());

  it("opens on Settings with the imported details", async () => {
    open();
    await importJson();
    expect(useFormBuilderStore.getState().step).toBe(1);
    expect(await screen.findByDisplayValue("Geography Quiz")).toBeInTheDocument();
  });

  it("keeps the imported draft through edits and a remount of the page", async () => {
    const first = open();
    await importJson();
    useFormBuilderStore.getState().setStep(2);
    await userEvent.type(await screen.findByDisplayValue("Capital of France?"), "!");
    first.unmount();

    open();
    expect(titles()).toEqual(["Capital of France?!", "Largest ocean?"]);
    expect(useFormBuilderStore.getState().form.title).toBe("Geography Quiz");
  });

  it("starts fresh once the previous form was published", () => {
    useFormBuilderStore.getState().updateMeta({ title: "Old" });
    useFormBuilderStore.getState().setSuccessData({ formId: "f", shareToken: "t" });
    open();
    expect(useFormBuilderStore.getState().form.title).toBe("");
  });
});
