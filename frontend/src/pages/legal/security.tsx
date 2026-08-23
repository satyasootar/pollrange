import { ShieldCheck } from "lucide-react";
import { FocusedPageLayout, FocusedSection } from "@/components/layout/focused-page-layout";

const TOC = [
  { id: "encryption", label: "Encryption in transit" },
  { id: "passwords", label: "Password storage" },
  { id: "sessions", label: "Sign-in and sessions" },
  { id: "uploads", label: "File uploads" },
  { id: "anonymous", label: "Anonymous poll protection" },
  { id: "rate-limiting", label: "Rate limiting" },
  { id: "report", label: "Reporting a security issue" },
];

export function SecurityPage() {
  return (
    <FocusedPageLayout
      icon={ShieldCheck}
      eyebrow="Legal"
      title="Security"
      subtitle="How we protect your account, your data, and your respondents' answers."
      summary="Every connection to Kollects is encrypted, passwords are hashed and never stored
        in plain text, sign-in uses secure cookies or Google, and every file you upload is
        checked before it's stored."
      toc={TOC}
    >
      <FocusedSection id="encryption" title="Encryption in transit">
        <p>All traffic to and from Kollects is encrypted using HTTPS. Your data is never sent
          over an unencrypted connection.</p>
      </FocusedSection>

      <FocusedSection id="passwords" title="Password storage">
        <p>We never store your password in plain text. Passwords are hashed with bcrypt, an
          industry-standard one-way hashing algorithm, before they are saved.</p>
      </FocusedSection>

      <FocusedSection id="sessions" title="Sign-in and sessions">
        <p>Kollects uses secure, httpOnly authentication cookies, which cannot be read by
          scripts running in your browser. You can also sign in with your Google account
          instead of a password.</p>
      </FocusedSection>

      <FocusedSection id="uploads" title="File uploads">
        <p>Files and images you upload are checked and stored through Cloudinary, a trusted
          file-hosting service. We block file types that are commonly used to spread
          malware, such as executable programs and scripts.</p>
      </FocusedSection>

      <FocusedSection id="anonymous" title="Anonymous poll protection">
        <p>To stop the same person from voting more than once on an anonymous poll, we
          store a one-way hash of their IP address rather than the IP address itself. This
          hash cannot be reversed to identify a specific person.</p>
      </FocusedSection>

      <FocusedSection id="rate-limiting" title="Rate limiting">
        <p>We limit how many requests a single visitor can make in a short time, which helps
          protect the service against automated abuse.</p>
      </FocusedSection>

      <FocusedSection id="report" title="Reporting a security issue">
        <p>If you believe you've found a security vulnerability in Kollects, please email us
          at <a href="mailto:security@kollects.com" className="text-primary underline">security@kollects.com</a>. Please
          give us a reasonable amount of time to fix the issue before sharing it publicly.
          We appreciate responsible disclosure and will respond as quickly as we can.</p>
      </FocusedSection>
    </FocusedPageLayout>
  );
}
