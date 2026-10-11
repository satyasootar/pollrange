import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormQuestionEditor } from "./form-question-editor";
import { useFormBuilderStore } from "@/store/use-form-builder-store";

const store = () => useFormBuilderStore.getState();
const section = () => store().form.sections[0]!;
const question = () => section().questions[0]!;

// Re-renders from the live store so edits flow back into the editor.
function Editor() {
  const q = useFormBuilderStore((s) => s.form.sections[0]!.questions[0]!);
  return <FormQuestionEditor sectionId={section().id} question={q} index={0} />;
}

describe("FormQuestionEditor UPI payment", () => {
  beforeEach(() => {
    store().reset();
    store().changeQuestionType(section().id, question().id, "checkboxes");
  });

  it("turning payment on reveals price inputs and the UPI ID field", async () => {
    render(<Editor />);
    expect(screen.queryByPlaceholderText("yourname@okaxis")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: /collect payment via upi/i }));

    expect(screen.getByPlaceholderText("yourname@okaxis")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^price for/i).length).toBe(question().options.length);
    expect(screen.getByText(/no option has a price yet/i)).toBeInTheDocument();
  });

  it("validates the UPI ID as you type and stores prices on options", async () => {
    render(<Editor />);
    await userEvent.click(screen.getByRole("switch", { name: /collect payment via upi/i }));

    const upi = screen.getByPlaceholderText("yourname@okaxis");
    await userEvent.type(upi, "bad-id");
    expect(screen.getByText(/doesn't look like a upi id/i)).toBeInTheDocument();

    await userEvent.clear(upi);
    await userEvent.type(upi, "host@okaxis");
    expect(screen.getByText(/payments go to host@okaxis/i)).toBeInTheDocument();

    const [price] = screen.getAllByLabelText(/^price for/i);
    await userEvent.type(price!, "150");
    expect(question().options[0]!.amount).toBe(150);
    expect(question().payment).toMatchObject({ enabled: true, upiId: "host@okaxis" });
    expect(screen.getByText(/1 of \d+ options priced/i)).toBeInTheDocument();
  });

  it("is not offered on dropdown questions", () => {
    store().changeQuestionType(section().id, question().id, "dropdown");
    render(<Editor />);
    expect(screen.queryByRole("switch", { name: /collect payment/i })).not.toBeInTheDocument();
  });
});
