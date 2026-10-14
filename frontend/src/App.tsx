import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/cookie-consent";
import { SiteTracker } from "@/components/site-tracker";
import { queryClient } from "@/lib/query-client";
import { config } from "@/config/config";

import { LandingPage } from "@/pages/landing";
import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { ForgotPasswordPage } from "@/pages/auth/forgot-password";
import { ResetPasswordPage } from "@/pages/auth/reset-password";
import { AuthSuccessPage } from "@/pages/auth/auth-success";
import { VerifyEmailPage } from "@/pages/auth/verify-email";

import { ProtectedRoute, GuestRoute } from "@/components/layout/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingPage } from "@/pages/onboarding";

import { DashboardPage } from "@/pages/dashboard";
import { OverviewPage } from "@/pages/dashboard/overview";
import { ChatPage } from "@/pages/dashboard/chat";
import { ProfilePage } from "@/pages/dashboard/profile";
import { BillingPage } from "@/pages/dashboard/billing";
import { BrandingPage } from "@/pages/dashboard/branding";
import { FormsPage } from "@/pages/dashboard/forms";
import { CreatePollPage } from "@/pages/polls/create";
import { EditPollPage } from "@/pages/polls/edit";
import { AnalyticsPage } from "@/pages/polls/analytics";
import { CreateFormPage } from "@/pages/forms/create";
import { EditFormPage } from "@/pages/forms/edit";
import { FormAnalyticsPage } from "@/pages/forms/analytics";
import { AdminPage, AdminRoute } from "@/pages/admin";
import { AdminUserPage } from "@/pages/admin/user";

import { PublicPollPage } from "@/pages/public/poll";
import { PublishedResultsPage } from "@/pages/public/results";
import { PublicFormPage } from "@/pages/public/form";
import { NotFoundPage } from "@/pages/not-found";

import { AboutPage } from "@/pages/company/about";
import { BlogPage } from "@/pages/company/blog";
import { CareersPage } from "@/pages/company/careers";
import { PressPage } from "@/pages/company/press";
import { PrivacyPage } from "@/pages/legal/privacy";
import { CookiePolicyPage } from "@/pages/legal/cookies";
import { TermsPage } from "@/pages/legal/terms";
import { SecurityPage } from "@/pages/legal/security";
import { DmcaPage } from "@/pages/legal/dmca";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public marketing */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/press" element={<PressPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/dmca" element={<DmcaPage />} />

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
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth-success" element={<AuthSuccessPage />} />

          {/* Public poll routes */}
          <Route path="/p/:shareToken" element={<PublicPollPage />} />
          <Route path="/p/:shareToken/results" element={<PublishedResultsPage />} />

          {/* Public form routes */}
          <Route path="/f/:shareToken" element={<PublicFormPage />} />

          {/* Protected creator routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="overview" element={<OverviewPage />} />
              {config.aiEnabled && <Route path="chat" element={<ChatPage />} />}
              <Route path="forms" element={<FormsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="branding" element={<BrandingPage />} />
            </Route>
            <Route element={<AppShell />}>
              <Route path="/polls/create" element={<CreatePollPage />} />
              <Route path="/polls/:pollId/edit" element={<EditPollPage />} />
              <Route path="/polls/:pollId/analytics" element={<AnalyticsPage />} />
              <Route path="/forms/create" element={<CreateFormPage />} />
              <Route path="/forms/:formId/edit" element={<EditFormPage />} />
              <Route path="/forms/:formId/analytics" element={<FormAnalyticsPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/users/:userId" element={<AdminUserPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster position="top-center" richColors expand />
        <CookieConsent />
        <SiteTracker />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
