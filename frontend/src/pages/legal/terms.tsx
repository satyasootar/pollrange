import { StaticPageLayout, PageSection } from "@/components/layout/static-page-layout";

export function TermsPage() {
  return (
    <StaticPageLayout
      eyebrow="Legal"
      title="Terms and Conditions"
      subtitle="Last updated: January 2026. Please read these terms before using Kollects."
    >
      <PageSection title="1. Accepting these terms">
        <p>By creating an account or using Kollects in any way, you agree to these terms. If
          you do not agree, please do not use the service.</p>
      </PageSection>

      <PageSection title="2. What Kollects is">
        <p>Kollects is a platform for creating polls, forms, and quizzes, sharing them, and
          viewing the results. We may add, change, or remove features over time.</p>
      </PageSection>

      <PageSection title="3. Your account">
        <p>You must provide accurate information when you sign up, and you are responsible
          for keeping your password safe. You are responsible for everything that happens
          under your account. Tell us right away if you think someone else has access to it.</p>
      </PageSection>

      <PageSection title="4. Acceptable use">
        <p>You agree not to use Kollects to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Break any law, or infringe anyone else's rights.</li>
          <li>Collect sensitive personal data (such as health or financial details) without a
            lawful basis and the respondent's consent.</li>
          <li>Send spam, or use polls and forms to harass, threaten, or deceive people.</li>
          <li>Upload malware, viruses, or any harmful files.</li>
          <li>Try to break, overload, or gain unauthorized access to our systems.</li>
        </ul>
        <p>We may suspend or remove content or accounts that break these rules.</p>
      </PageSection>

      <PageSection title="5. Your content">
        <p>You own the polls, forms, quizzes, and files you create. By uploading content to
          Kollects, you give us permission to store, display, and process it only so we can
          provide the service to you and your respondents. You are responsible for making
          sure you have the right to share anything you upload.</p>
      </PageSection>

      <PageSection title="6. Respondent answers">
        <p>If you create a poll or form, you are responsible for how you use the answers you
          collect, including complying with any privacy laws that apply to you and your
          respondents.</p>
      </PageSection>

      <PageSection title="7. Our intellectual property">
        <p>The Kollects name, logo, and product design belong to us. These terms do not give
          you any right to use our branding without permission.</p>
      </PageSection>

      <PageSection title="8. Ending your account">
        <p>You may delete your account at any time from your profile settings. We may
          suspend or end your account if you break these terms, or if we shut down the
          service. We will try to give reasonable notice where possible.</p>
      </PageSection>

      <PageSection title="9. Service provided as-is">
        <p>Kollects is provided "as is", without warranties of any kind. We do our best to
          keep the service reliable and accurate, but we cannot guarantee it will always be
          available or error-free.</p>
      </PageSection>

      <PageSection title="10. Limitation of liability">
        <p>To the fullest extent the law allows, Kollects is not liable for indirect,
          incidental, or consequential damages arising from your use of the service.</p>
      </PageSection>

      <PageSection title="11. Changes to these terms">
        <p>We may update these terms from time to time. If we make a significant change, we
          will update the date at the top of this page and, where appropriate, let you know.</p>
      </PageSection>

      <PageSection title="12. Contact us">
        <p>Questions about these terms? Email us at
          <a href="mailto:legal@kollects.com" className="text-primary underline"> legal@kollects.com</a>.</p>
      </PageSection>
    </StaticPageLayout>
  );
}
