import { describe, it, expect, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ProfilePage } from "./profile";
import { renderAtRoute } from "@/test/utils";
import { server } from "@/test/msw/server";
import { useAuthStore } from "@/store/use-auth-store";
import type { User } from "@/types";

const API = "http://localhost:3030/api";
const user = (o: Partial<User>) =>
  ({ _id: "u1", name: "Asha", email: "asha@test.dev", isEmailVerified: true, ...o }) as User;

function captureChangePassword(created: boolean) {
  const calls: Record<string, unknown>[] = [];
  server.use(
    http.post(`${API}/auth/change-password`, async ({ request }) => {
      calls.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ data: { created } });
    })
  );
  return calls;
}

afterEach(() => useAuthStore.setState({ user: null }));

describe("ProfilePage password", () => {
  it("Google-only account: explains it and adds a first password without a current one", async () => {
    useAuthStore.setState({ user: user({ hasPassword: false, hasGoogle: true }) });
    const calls = captureChangePassword(true);
    renderAtRoute(<ProfilePage />, { path: "/dashboard/profile", route: "/dashboard/profile" });

    expect(screen.getByText(/so there's no password to update yet/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^password$/i), "short");
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^password$/i), "-but-long");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "short-but-long");
    await userEvent.click(screen.getByRole("button", { name: /add password/i }));

    await waitFor(() => expect(calls).toEqual([{ newPassword: "short-but-long" }]));
  });

  it("account with a password: asks for the current one to update it", async () => {
    useAuthStore.setState({ user: user({ hasPassword: true, hasGoogle: true }) });
    const calls = captureChangePassword(false);
    renderAtRoute(<ProfilePage />, { path: "/dashboard/profile", route: "/dashboard/profile" });

    expect(screen.getByText(/sign in with google or with your email and password/i)).toBeInTheDocument();
    const update = screen.getByRole("button", { name: /update password/i });
    await userEvent.type(screen.getByLabelText(/new password/i), "brand-new-1");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "brand-new-1");
    expect(update).toBeDisabled(); // current password still empty
    await userEvent.type(screen.getByLabelText(/current password/i), "old-pass-1");
    await userEvent.click(update);

    await waitFor(() => expect(calls).toEqual([{ oldPassword: "old-pass-1", newPassword: "brand-new-1" }]));
  });
});
