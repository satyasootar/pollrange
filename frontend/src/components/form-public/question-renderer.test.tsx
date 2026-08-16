import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionRenderer, type AnswerDraft } from "./question-renderer";
import type { FormQuestion } from "@/types";

// Harness surfaces the controlled value so we assert the exact submit contract.
function Harness({ question, preview = false }: { question: FormQuestion; preview?: boolean }) {
  const [value, setValue] = useState<AnswerDraft>({});
  return (
    <>
      <QuestionRenderer
        formId="form1"
        preview={preview}
        question={question}
        value={value}
        onChange={(patch) =>
          setValue((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }))
        }
      />
      <pre data-testid="val">{JSON.stringify(value)}</pre>
    </>
  );
}
const val = () => JSON.parse(screen.getByTestId("val").textContent || "{}");

const q = (o: Partial<FormQuestion>): FormQuestion => ({
  _id: "q1",
  order: 0,
  type: "short_answer",
  title: "T",
  isRequired: false,
  options: [],
  ...o,
});

describe("QuestionRenderer", () => {
  it("short_answer captures text", async () => {
    render(<Harness question={q({ type: "short_answer" })} />);
    await userEvent.type(screen.getByPlaceholderText("Your answer"), "hello");
    expect(val().textValue).toBe("hello");
  });

  it("multiple_choice selects a single option (replacing prior)", async () => {
    const question = q({
      type: "multiple_choice",
      options: [
        { _id: "a", text: "Alpha", order: 0 },
        { _id: "b", text: "Beta", order: 1 },
      ],
    });
    render(<Harness question={question} />);
    await userEvent.click(screen.getByText("Alpha"));
    expect(val().selectedOptionIds).toEqual(["a"]);
    await userEvent.click(screen.getByText("Beta"));
    expect(val().selectedOptionIds).toEqual(["b"]); // single-select replaces
  });

  it("checkboxes toggle multiple options on and off", async () => {
    const question = q({
      type: "checkboxes",
      options: [
        { _id: "a", text: "Alpha", order: 0 },
        { _id: "b", text: "Beta", order: 1 },
      ],
    });
    render(<Harness question={question} />);
    await userEvent.click(screen.getByText("Alpha"));
    await userEvent.click(screen.getByText("Beta"));
    expect(val().selectedOptionIds).toEqual(["a", "b"]);
    await userEvent.click(screen.getByText("Alpha"));
    expect(val().selectedOptionIds).toEqual(["b"]);
  });

  it("dropdown selects via a native select", async () => {
    const question = q({
      type: "dropdown",
      options: [
        { _id: "a", text: "Alpha", order: 0 },
        { _id: "b", text: "Beta", order: 1 },
      ],
    });
    render(<Harness question={question} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "b");
    expect(val().selectedOptionIds).toEqual(["b"]);
  });

  it("linear_scale renders min..max buttons and records the pick", async () => {
    render(<Harness question={q({ type: "linear_scale", scaleMin: 1, scaleMax: 5 })} />);
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "4" }));
    expect(val().scaleValue).toBe(4);
  });

  it("date input records an ISO date", async () => {
    render(<Harness question={q({ type: "date" })} />);
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    await userEvent.type(input, "2026-08-16");
    expect(val().dateValue).toBe("2026-08-16");
  });

  it("multiple_choice_grid records a single column per row", async () => {
    const question = q({ type: "multiple_choice_grid", rows: ["R1", "R2"], columns: ["C1", "C2"] });
    const { container } = render(<Harness question={question} />);
    // first data row, first cell button
    const rows = container.querySelectorAll("tbody tr");
    const firstCellBtn = rows[0]!.querySelectorAll("button")[0]!;
    await userEvent.click(firstCellBtn);
    expect(val().gridValues).toEqual([{ row: "R1", columns: ["C1"] }]);
  });

  it("renders nothing breakable when a choice question has no options", () => {
    const { container } = render(<Harness question={q({ type: "multiple_choice", options: undefined })} />);
    expect(container.querySelectorAll("button").length).toBe(0);
  });

  it("file_upload: previews then swaps to the uploaded file (background upload via MSW)", async () => {
    render(<Harness question={q({ type: "file_upload", fileConfig: { maxFiles: 2, maxSizeMb: 5, allowedTypes: [] } })} />);
    const file = new File(["x"], "photo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);
    // The mock backend returns name "file.png"; it should appear once uploaded.
    expect(await screen.findByText("file.png")).toBeInTheDocument();
    expect(val().fileUrls?.[0]?.url).toBe("https://cdn.test/file.png");
  });

  it("file_upload is disabled in preview mode (no upload input active)", () => {
    render(<Harness preview question={q({ type: "file_upload" })} />);
    expect(screen.getByText(/disabled in preview/i)).toBeInTheDocument();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it("file_upload rejects a file over the size cap", async () => {
    render(<Harness question={q({ type: "file_upload", fileConfig: { maxFiles: 1, maxSizeMb: 1, allowedTypes: [] } })} />);
    const big = new File([new Uint8Array(2 * 1024 * 1024)], "big.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, big);
    // Nothing gets added to the answer.
    expect(val().fileUrls ?? []).toEqual([]);
    expect(screen.queryByText("file.png")).not.toBeInTheDocument();
  });
});
