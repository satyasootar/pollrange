import { describe, it, expect, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { PublicFormPage } from "./form";
import { renderAtRoute } from "@/test/utils";
import { server } from "@/test/msw/server";
import { testState } from "@/test/msw/handlers";
import { useAuthStore } from "@/store/use-auth-store";
import type { User } from "@/types";
import {
  makePublicForm,
  makeSection,
  makeFormQuestion,
  makeChoiceQuestion,
  makeQuizResults,
  defaultFormSettings,
} from "@/test/msw/factories";

const API = "http://localhost:3030/api";
const renderPage = () => renderAtRoute(<PublicFormPage />, { path: "/f/:shareToken", route: "/f/tok123" });

describe("PublicFormPage", () => {
  afterEach(() => useAuthStore.setState({ user: null }));

  it("asks a signed-out respondent to sign in before picking a file", async () => {
    testState.publicForm = makePublicForm({
      sections: [makeSection([makeFormQuestion({ type: "file_upload", title: "Attachment", fileConfig: { maxFiles: 1, maxSizeMb: 5, allowedTypes: [] } })])],
    });
    renderPage();
    await screen.findByText("Attachment");
    await userEvent.click(document.querySelector('input[type="file"]') as HTMLInputElement);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

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
    useAuthStore.setState({ user: { _id: "u1", name: "Asha", email: "a@x.dev" } as User });
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

  describe("UPI payment flow", () => {
    const paidForm = (payment: Record<string, unknown> = {}) =>
      makePublicForm({
        title: "Tech Fest",
        sections: [
          makeSection([
            makeFormQuestion({
              _id: "q-pay",
              type: "checkboxes",
              title: "Workshops",
              isRequired: true,
              options: [
                { _id: "o1", text: "Coding", order: 0, amount: 100 },
                { _id: "o2", text: "AI", order: 1, amount: 250 },
                { _id: "o3", text: "Networking", order: 2 },
              ],
              payment: { enabled: true, upiId: "host@okaxis", messageTemplate: "Ref {form_response_id}", ...payment },
            }),
          ]),
        ],
      });

    const serverPays = (payment: unknown) =>
      server.use(
        http.post(`${API}/form-responses/:formId`, async ({ request }) => {
          testState.submittedForm = (await request.json()) as typeof testState.submittedForm;
          return HttpResponse.json({ statusCode: 200, success: true, message: "ok", data: { _id: "resp1", isComplete: true, payment } });
        })
      );

    it("shows a live total, submits, then shows the pay screen with the server's amount and a QR", async () => {
      testState.publicForm = paidForm();
      serverPays({ totalAmount: 350, selectedOptions: ["Coding", "AI"], message: "Ref resp1", upiId: "host@okaxis" });
      renderPage();

      await userEvent.click(await screen.findByText("Coding"));
      await userEvent.click(screen.getByText("AI"));
      expect(screen.getByText(/pay by upi after you submit/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/qr code/i)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /submit/i }));

      expect(await screen.findByText(/complete your payment/i)).toBeInTheDocument();
      expect(screen.getByText("₹350")).toBeInTheDocument();
      expect(screen.getByLabelText(/qr code/i)).toBeInTheDocument();
      const payLink = screen.getByRole("link", { name: /pay with upi app/i });
      const params = new URLSearchParams(payLink.getAttribute("href")!.split("?")[1]);
      expect(params.get("pa")).toBe("host@okaxis");
      expect(params.get("am")).toBe("350.00");
      expect(params.get("tn")).toBe("Ref resp1");
      expect(params.get("pn")).toBe("Tech Fest");
      expect(testState.submittedForm!.answers[0].selectedOptionIds).toEqual(["o1", "o2"]);
    });

    it("skips the pay screen when the server says nothing is due", async () => {
      testState.publicForm = paidForm();
      serverPays(undefined);
      renderPage();
      await userEvent.click(await screen.findByText("Networking"));
      await userEvent.click(screen.getByRole("button", { name: /submit/i }));
      expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
      expect(screen.queryByText(/complete your payment/i)).not.toBeInTheDocument();
    });

    it("blocks submit client-side when picks break the min/max limit", async () => {
      testState.publicForm = paidForm({ minSelections: 2 });
      renderPage();
      await userEvent.click(await screen.findByText("Coding"));
      await userEvent.click(screen.getByRole("button", { name: /submit/i }));
      await waitFor(() => expect(screen.queryByText(/complete your payment/i)).not.toBeInTheDocument());
      expect(testState.submittedForm).toBeNull();
    });
  });

  it("shows the Made with Kollects badge only when the creator's plan lacks branding", async () => {
    testState.publicForm = makePublicForm({ showPoweredBy: true });
    const { unmount } = renderPage();
    expect(await screen.findByText(/made with/i)).toBeInTheDocument();
    unmount();

    testState.publicForm = makePublicForm({ showPoweredBy: false });
    renderPage();
    await screen.findByPlaceholderText("Your answer");
    expect(screen.queryByText(/made with/i)).not.toBeInTheDocument();
  });

  describe("quiz", () => {
    const quiz = (o: Parameters<typeof makePublicForm>[0] = {}) =>
      makePublicForm({ isQuiz: true, sections: [makeSection([makeChoiceQuestion({ isRequired: true, points: 5 })])], ...o });

    it("requires a leaderboard name from signed-out takers", async () => {
      testState.publicForm = quiz();
      renderPage();
      await userEvent.click(await screen.findByText("Alpha"));
      await userEvent.click(screen.getByRole("button", { name: /submit/i }));
      await waitFor(() => expect(testState.submittedForm).toBeNull());
    });

    it("does not ask for a name on a sign-in-required quiz (the account name is used)", async () => {
      testState.publicForm = quiz({ responseMode: "authenticated" });
      renderPage();
      await screen.findByText("Alpha");
      expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/leaderboard/i)).not.toBeInTheDocument();
    });

    it("submits the name and shows the score on the same link while results are pending", async () => {
      testState.publicForm = quiz();
      renderPage();
      await userEvent.type(await screen.findByLabelText(/your name/i), "Ada");
      await userEvent.click(screen.getByText("Alpha"));
      await userEvent.click(screen.getByRole("button", { name: /submit/i }));

      expect(await screen.findByText(/your score/i)).toBeInTheDocument();
      expect(testState.submittedForm!.respondentName).toBe("Ada");
      expect(screen.getByText(/waiting for the organizer/i)).toBeInTheDocument();
      expect(screen.queryByText(/leaderboard/i)).not.toBeInTheDocument();
    });

    it("shows the published leaderboard with the viewer's own row and rank on revisit", async () => {
      testState.publicForm = quiz({ alreadyResponded: true, status: "published" });
      testState.quizResults = makeQuizResults({
        status: "published",
        resultsPublished: true,
        me: { name: "Ada", submittedAt: "2026-10-18T10:00:00Z", score: 4, totalPoints: 5, rank: 2 },
        leaderboard: {
          participants: 3,
          maxPoints: 5,
          entries: [
            { rank: 1, name: "Grace Hopper", score: 5, totalPoints: 5, submittedAt: "2026-10-18T10:00:00Z" },
            { rank: 2, name: "Ada", score: 4, totalPoints: 5, submittedAt: "2026-10-18T10:01:00Z", isMe: true },
            { rank: 3, name: "Alan Turing", score: 2, totalPoints: 5, submittedAt: "2026-10-18T10:02:00Z" },
          ],
        },
        review: [
          { questionId: "q", title: "Pick one", points: 5, pointsEarned: 0, isCorrect: false, yourAnswer: ["Beta"], correctAnswer: ["Alpha"] },
        ],
      });
      renderPage();

      expect(await screen.findByRole("heading", { name: /leaderboard/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/1st place: Grace Hopper/i)).toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();
      expect(screen.getByText("You")).toBeInTheDocument();
      expect(screen.getByText(/0 of 1 correct/i)).toBeInTheDocument();
    });

    it("auto-submits the answers so far when the timer runs out", async () => {
      const now = Date.now();
      testState.publicForm = quiz({
        expiresAt: new Date(now + 1500).toISOString(),
        serverTime: new Date(now).toISOString(),
        sections: [makeSection([makeChoiceQuestion({ isRequired: true, points: 5 }), makeFormQuestion({ isRequired: true })])],
      });
      renderPage();
      expect(await screen.findByRole("timer")).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/your name/i), "Ada");
      await userEvent.click(screen.getByText("Alpha"));

      await waitFor(() => expect(testState.submittedForm).not.toBeNull(), { timeout: 4000 });
      expect(testState.submittedForm!.timedOut).toBe(true);
      expect(await screen.findByText(/time ran out/i)).toBeInTheDocument();
    });
  });
});
