import { Lock } from "lucide-react";
import { openCookieSettings } from "@/lib/consent";
import { Link } from "react-router-dom";
import { FocusedPageLayout, FocusedSection } from "@/components/layout/focused-page-layout";

const TOC = [
  { id: "who-we-are", label: "Who we are" },
  { id: "information-we-collect", label: "Information we collect" },
  { id: "how-we-use-it", label: "How we use it" },
  { id: "cookies", label: "Cookies" },
  { id: "sharing", label: "Who we share data with" },
  { id: "retention", label: "How long we keep data" },
  { id: "your-rights", label: "Your rights" },
  { id: "children", label: "Children's privacy" },
  { id: "security", label: "Security" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact us" },
];

export function PrivacyPage() {
  return (
    <FocusedPageLayout
      icon={Lock}
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="Last updated October 2026. This page explains what data Kollects collects, why, and how you can control it."
      summary="We collect only what's needed to run your account, your polls and forms, and the
        answers people give. We never sell your data or use it for advertising, and you
        can view, export, or delete your information at any time from your profile."
      toc={TOC}
    >
      <FocusedSection id="who-we-are" title="Who we are">
        <p>
          Kollects ("we", "us", "our") provides a platform for creating polls, forms, and
          quizzes and viewing their results. This policy applies to everyone who uses our
          website, whether you create a poll or form (a "creator") or simply respond to one
          (a "respondent").
        </p>
      </FocusedSection>

      <FocusedSection id="information-we-collect" title="Information we collect">
        <p><strong>Account information.</strong> If you create an account, we collect your name,
          email address, and a securely hashed password. If you sign up with Google, we
          receive your name, email, and profile photo from Google.</p>
        <p><strong>Content you create.</strong> The polls, forms, quizzes, and questions you
          build, along with any images or files you upload.</p>
        <p><strong>Response data.</strong> When someone answers a poll or form, we store their
          answers. For anonymous polls and forms, we do not require a name or email. For
          polls or forms that require sign-in, we store the respondent's account information
          along with their answers.</p>
        <p><strong>Technical data.</strong> To stop the same person from voting twice on an
          anonymous poll, we store a one-way hash of their IP address and browser
          information. We cannot reverse this hash back into an IP address.</p>
        <p><strong>Cookies.</strong> See <a href="#cookies" className="text-primary underline">Cookies</a> below.</p>
      </FocusedSection>

      <FocusedSection id="how-we-use-it" title="How we use your information">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To run your account and let you build and manage polls and forms.</li>
          <li>To show you and your respondents accurate, up-to-date results.</li>
          <li>To send you account emails, such as verifying your address or resetting your password.</li>
          <li>To keep the platform secure and prevent abuse, such as duplicate voting.</li>
          <li>To improve the product based on how it is used.</li>
        </ul>
      </FocusedSection>

      <FocusedSection id="cookies" title="Cookies">
        <p>We ask before using any cookie that isn't needed to run the site, optional cookies stay
          off until you turn them on, and saying no is as easy as saying yes. We never use cookies
          for advertising, and we keep a record of each choice (with a one-way hash of your IP
          address, never the address itself) so we can show what you agreed to.</p>
        <p>Our <Link to="/cookies" className="text-primary underline">Cookie Policy</Link> lists
          every cookie we use, what it's for, and how long it lasts.</p>
        <p>
          <button type="button" onClick={openCookieSettings} className="text-primary underline">
            Change your cookie settings
          </button>{" "}
          at any time.
        </p>
      </FocusedSection>

      <FocusedSection id="sharing" title="Who we share data with">
        <p>We do not sell your data. We share data only with the services that help us run
          Kollects, and only as much as each one needs to do its job:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Cloudinary</strong> stores images and files uploaded to polls and forms.</li>
          <li><strong>Resend</strong> sends account emails, such as verification and password reset links.</li>
          <li><strong>Google</strong> handles sign-in if you choose to use "Sign in with Google".</li>
          <li><strong>MongoDB Atlas</strong> hosts our database.</li>
        </ul>
        <p>We may also share information if the law requires it, or to protect the rights and
          safety of Kollects and our users.</p>
      </FocusedSection>

      <FocusedSection id="retention" title="How long we keep data">
        <p>We keep your account and content for as long as your account is active. If you
          delete a poll or form, we delete it and its responses from our active database.
          If you delete your account, we remove your personal information within a
          reasonable time, except where we must keep records to meet a legal obligation.</p>
      </FocusedSection>

      <FocusedSection id="your-rights" title="Your rights">
        <p>You can access, correct, export, or delete your account information at any time
          from your profile settings. You can also contact us at
          <a href="mailto:privacy@kollects.com" className="text-primary underline"> privacy@kollects.com</a> to
          ask us to delete your data or answer questions about how it's used.</p>
      </FocusedSection>

      <FocusedSection id="children" title="Children's privacy">
        <p>Kollects is not directed at children under 13, and we do not knowingly collect
          personal information from children under 13. If you believe a child has given us
          personal information, contact us and we will remove it.</p>
      </FocusedSection>

      <FocusedSection id="security" title="Security">
        <p>We use industry-standard measures to protect your data, including encrypted
          connections (HTTPS), hashed passwords, and secure, httpOnly authentication
          cookies. See our <a href="/security" className="text-primary underline">Security page</a> for more detail.</p>
      </FocusedSection>

      <FocusedSection id="changes" title="Changes to this policy">
        <p>If we make material changes to this policy, we will update the date at the top of
          this page and, where appropriate, notify you by email.</p>
      </FocusedSection>

      <FocusedSection id="contact" title="Contact us">
        <p>Questions about this policy? Email us at
          <a href="mailto:privacy@kollects.com" className="text-primary underline"> privacy@kollects.com</a>.</p>
      </FocusedSection>
    </FocusedPageLayout>
  );
}
