import { StaticPageLayout, PageSection } from "@/components/layout/static-page-layout";

export function DmcaPage() {
  return (
    <StaticPageLayout
      eyebrow="Legal"
      title="DMCA Policy"
      subtitle="How to report copyrighted material shared on Kollects without permission."
    >
      <PageSection title="Overview">
        <p>Kollects respects the intellectual property rights of others and expects users of
          our service to do the same. We respond to clear notices of alleged copyright
          infringement in accordance with the Digital Millennium Copyright Act (DMCA).</p>
      </PageSection>

      <PageSection title="Filing a takedown notice">
        <p>If you believe content hosted on Kollects infringes your copyright, send a written
          notice to our designated agent below that includes:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>A description of the copyrighted work you believe has been infringed.</li>
          <li>The exact location (URL) of the material you believe is infringing.</li>
          <li>Your name, address, phone number, and email address.</li>
          <li>A statement that you have a good-faith belief the use is not authorized by the
            copyright owner, its agent, or the law.</li>
          <li>A statement, made under penalty of perjury, that the information in your notice
            is accurate and that you are the copyright owner or authorized to act on their behalf.</li>
          <li>Your physical or electronic signature.</li>
        </ul>
      </PageSection>

      <PageSection title="Counter-notice">
        <p>If you believe material you posted was removed by mistake or misidentification,
          you may send a counter-notice with your name, contact information, the material
          removed and its former location, and a statement under penalty of perjury that you
          have a good-faith belief the material was removed in error. We may restore the
          material after a reasonable waiting period unless the original complainant files
          a court action.</p>
      </PageSection>

      <PageSection title="Repeat infringers">
        <p>We may suspend or terminate the accounts of users who are found to repeatedly
          infringe the copyrights of others.</p>
      </PageSection>

      <PageSection title="Designated agent">
        <p>Send DMCA notices and counter-notices to
          <a href="mailto:dmca@kollects.com" className="text-primary underline"> dmca@kollects.com</a>.</p>
      </PageSection>
    </StaticPageLayout>
  );
}
