import { Scale } from "lucide-react";
import { FocusedPageLayout, FocusedSection } from "@/components/layout/focused-page-layout";

const TOC = [
  { id: "acceptance", label: "1. Accepting these terms" },
  { id: "the-service", label: "2. What Kollects is" },
  { id: "your-account", label: "3. Your account" },
  { id: "acceptable-use", label: "4. Acceptable use" },
  { id: "your-content", label: "5. Your content" },
  { id: "respondent-answers", label: "6. Respondent answers" },
  { id: "our-ip", label: "7. Our intellectual property" },
  { id: "termination", label: "8. Ending your account" },
  { id: "as-is", label: "9. Service provided as-is" },
  { id: "liability", label: "10. Limitation of liability" },
  { id: "changes", label: "11. Changes to these terms" },
  { id: "contact", label: "12. Contact us" },
];

export function TermsPage() {
  return (
    <FocusedPageLayout
      icon={Scale}
      eyebrow="Legal"
      title="Terms and Conditions"
      subtitle="Last updated January 2026. Please read these terms before using Kollects."
      summary="Use Kollects lawfully and respectfully, and the polls, forms, and content you
        create are yours to keep. We can suspend accounts that break these rules or misuse
        the service, and the platform is provided as-is, without guarantees of uptime."
      toc={TOC}
    >
      <FocusedSection id="acceptance" title="1. Accepting these terms">
        <p>By creating an account or using Kollects in any way, you agree to these terms. If
          you do not agree, please do not use the service.</p>
      </FocusedSection>

      <FocusedSection id="the-service" title="2. What Kollects is">
        <p>Kollects is a platform for creating polls, forms, and quizzes, sharing them, and
          viewing the results. We may add, change, or remove features over time.</p>
      </FocusedSection>

      <FocusedSection id="your-account" title="3. Your account">
        <p>You must provide accurate information when you sign up, and you are responsible
          for keeping your password safe. You are responsible for everything that happens
          under your account. Tell us right away if you think someone else has access to it.</p>
      </FocusedSection>

      <FocusedSection id="acceptable-use" title="4. Acceptable use">
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
      </FocusedSection>

      <FocusedSection id="your-content" title="5. Your content">
        <p>You own the polls, forms, quizzes, and files you create. By uploading content to
          Kollects, you give us permission to store, display, and process it only so we can
          provide the service to you and your respondents. You are responsible for making
          sure you have the right to share anything you upload.</p>
      </FocusedSection>

      <FocusedSection id="respondent-answers" title="6. Respondent answers">
        <p>If you create a poll or form, you are responsible for how you use the answers you
          collect, including complying with any privacy laws that apply to you and your
          respondents.</p>
      </FocusedSection>

      <FocusedSection id="our-ip" title="7. Our intellectual property">
        <p>The Kollects name, logo, and product design belong to us. These terms do not give
          you any right to use our branding without permission.</p>
      </FocusedSection>

      <FocusedSection id="termination" title="8. Ending your account">
        <p>You may delete your account at any time from your profile settings. We may
          suspend or end your account if you break these terms, or if we shut down the
          service. We will try to give reasonable notice where possible.</p>
      </FocusedSection>

      <FocusedSection id="as-is" title="9. Service provided as-is">
        <p>Kollects is provided "as is", without warranties of any kind. We do our best to
          keep the service reliable and accurate, but we cannot guarantee it will always be
          available or error-free.</p>
      </FocusedSection>

      <FocusedSection id="liability" title="10. Limitation of liability">
        <p>To the fullest extent the law allows, Kollects is not liable for indirect,
          incidental, or consequential damages arising from your use of the service.</p>
      </FocusedSection>

      <FocusedSection id="changes" title="11. Changes to these terms">
        <p>We may update these terms from time to time. If we make a significant change, we
          will update the date at the top of this page and, where appropriate, let you know.</p>
      </FocusedSection>

      <FocusedSection id="contact" title="12. Contact us">
        <p>Questions about these terms? Email us at
          <a href="mailto:legal@kollects.com" className="text-primary underline"> legal@kollects.com</a>.</p>
      </FocusedSection>
    </FocusedPageLayout>
  );
}
