import { StaticPageLayout, PageSection } from "@/components/layout/static-page-layout";

export function SecurityPage() {
  return (
    <StaticPageLayout
      eyebrow="Legal"
      title="Security"
      subtitle="How we protect your account, your data, and your respondents' answers."
    >
      <PageSection title="Encryption in transit">
        <p>All traffic to and from Kollects is encrypted using HTTPS. Your data is never sent
          over an unencrypted connection.</p>
      </PageSection>

      <PageSection title="Password storage">
        <p>We never store your password in plain text. Passwords are hashed with bcrypt, a
          industry-standard one-way hashing algorithm, before they are saved.</p>
      </PageSection>

      <PageSection title="Sign-in and sessions">
        <p>Kollects uses secure, httpOnly authentication cookies, which cannot be read by
          scripts running in your browser. You can also sign in with your Google account
          instead of a password.</p>
      </PageSection>

      <PageSection title="File uploads">
        <p>Files and images you upload are checked and stored through Cloudinary, a trusted
          file-hosting service. We block file types that are commonly used to spread
          malware, such as executable programs and scripts.</p>
      </PageSection>

      <PageSection title="Anonymous poll protection">
        <p>To stop the same person from voting more than once on an anonymous poll, we
          store a one-way hash of their IP address rather than the IP address itself. This
          hash cannot be reversed to identify a specific person.</p>
      </PageSection>

      <PageSection title="Rate limiting">
        <p>We limit how many requests a single visitor can make in a short time, which helps
          protect the service against automated abuse.</p>
      </PageSection>

      <PageSection title="Reporting a security issue">
        <p>If you believe you've found a security vulnerability in Kollects, please email us
          at <a href="mailto:security@kollects.com" className="text-primary underline">security@kollects.com</a>. Please
          give us a reasonable amount of time to fix the issue before sharing it publicly.
          We appreciate responsible disclosure and will respond as quickly as we can.</p>
      </PageSection>
    </StaticPageLayout>
  );
}
