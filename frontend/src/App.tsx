import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/query-client";

import { LandingPage } from "@/pages/landing";
import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { ForgotPasswordPage } from "@/pages/auth/forgot-password";
import { ResetPasswordPage } from "@/pages/auth/reset-password";
import { AuthSuccessPage } from "@/pages/auth/auth-success";

import { ProtectedRoute, GuestRoute } from "@/components/layout/protected-route";
import { AppShell } from "@/components/layout/app-shell";

import { DashboardPage } from "@/pages/dashboard";
import { CreatePollPage } from "@/pages/polls/create";
import { EditPollPage } from "@/pages/polls/edit";
import { AnalyticsPage } from "@/pages/polls/analytics";

import { PublicPollPage } from "@/pages/public/poll";
import { PublishedResultsPage } from "@/pages/public/results";
import { NotFoundPage } from "@/pages/not-found";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public marketing */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth — redirect if already logged in */}
          <Route
            path="/auth/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/auth/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth-success" element={<AuthSuccessPage />} />

          {/* Public poll routes */}
          <Route path="/p/:shareToken" element={<PublicPollPage />} />
          <Route path="/p/:shareToken/results" element={<PublishedResultsPage />} />

          {/* Protected creator routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/polls/create" element={<CreatePollPage />} />
              <Route path="/polls/:pollId/edit" element={<EditPollPage />} />
              <Route path="/polls/:pollId/analytics" element={<AnalyticsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster position="top-center" richColors expand />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
