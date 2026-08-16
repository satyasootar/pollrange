import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { PublicFormPage } from "./form";
import { renderAtRoute } from "@/test/utils";
import { server } from "@/test/msw/server";
import { testState } from "@/test/msw/handlers";
import {
  makePublicForm,
  makeSection,
  makeFormQuestion,
  defaultFormSettings,
} from "@/test/msw/factories";

const API = "http://localhost:3030/api";
const renderPage = () => renderAtRoute(<PublicFormPage />, { path: "/f/:shareToken", route: "/f/tok123" });

describe("PublicFormPage", () => {
  it("submits a valid response and shows the thank-you screen", async () => {
    renderPage();
    const input = await screen.findByPlaceholderText("Your answer");
    await userEvent.type(input, "Ada Lovelace");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
    expect(testState.submittedForm).toBeTruthy();
    expect(testState.submittedForm!.answers[0].textValue).toBe("Ada Lovelace");
    expect(testState.submittedForm!.isComplete).toBe(true);
  });

  it("blocks submit and does not call the backend when a required question is empty", async () => {
    renderPage();
    await screen.findByPlaceholderText("Your answer");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(screen.queryByText(/thank you/i)).not.toBeInTheDocument());
    expect(testState.submittedForm).toBeNull();
  });

  it("shows the ended screen for a closed form", async () => {
    testState.publicForm = makePublicForm({ status: "closed" });
    renderPage();
    expect(await screen.findByText(/this form has ended/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });

  it("shows the already-responded screen", async () => {
    testState.publicForm = makePublicForm({ alreadyResponded: true });
    renderPage();
    expect(await screen.findByText(/already responded/i)).toBeInTheDocument();
  });

  it("requires an email when the form collects emails", async () => {
    testState.publicForm = makePublicForm({
      settings: defaultFormSettings({ collectEmail: true }),
      sections: [makeSection([makeFormQuestion({ isRequired: true, title: "Your name" })])],
    });
    renderPage();
    const input = await screen.findByPlaceholderText("Your answer");
    await userEvent.type(input, "Grace");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    // Blocked: no email yet.
    await waitFor(() => expect(testState.submittedForm).toBeNull());

    await userEvent.type(screen.getByPlaceholderText(/you@example/i), "grace@test.dev");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
    expect(testState.submittedForm!.respondentEmail).toBe("grace@test.dev");
  });

  it("gates the submit button while a file is uploading, then allows it", async () => {
    testState.publicForm = makePublicForm({
      sections: [makeSection([makeFormQuestion({ type: "file_upload", isRequired: true, title: "Attachment", fileConfig: { maxFiles: 1, maxSizeMb: 5, allowedTypes: [] } })])],
    });
    // Slow upload so we can observe the gated state deterministically.
    server.use(
      http.post(`${API}/form-responses/:formId/upload`, async () => {
        await delay(60);
        return HttpResponse.json({ data: { url: "https://cdn.test/a.png", name: "a.png", size: 1, mimeType: "image/png" } });
      })
    );

    renderPage();
    await screen.findByText("Attachment");
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, new File(["x"], "a.png", { type: "image/png" }));

    // While uploading, the action button is disabled and shows the uploading label.
    expect(await screen.findByRole("button", { name: /uploading files/i })).toBeDisabled();

    // Once the upload settles, submit is enabled again.
    await waitFor(() => expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
    expect(testState.submittedForm!.answers[0].fileUrls![0].url).toBe("https://cdn.test/a.png");
  });
});
