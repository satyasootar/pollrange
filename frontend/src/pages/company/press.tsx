import { Download } from "lucide-react";
import { StaticPageLayout, PageSection } from "@/components/layout/static-page-layout";
import { Button } from "@/components/ui/button";

export function PressPage() {
  return (
    <StaticPageLayout
      eyebrow="Company"
      title="Press"
      subtitle="Resources for journalists and writers covering Kollects."
    >
      <PageSection title="About Kollects">
        <p>
          Kollects is a platform for creating polls, forms, and quizzes and viewing their
          results live. It's built for anyone who needs quick, honest feedback: teachers,
          teams, event organizers, and communities.
        </p>
      </PageSection>

      <PageSection title="Brand assets">
        <p>Please don't alter the logo's colors or proportions, or use it to imply an
          endorsement that hasn't been agreed to in writing.</p>
        <a href="/logo/logo1.png" download>
          <Button variant="outline" className="mt-2 gap-2 rounded-none">
            <Download className="h-4 w-4" /> Download logo
          </Button>
        </a>
      </PageSection>

      <PageSection title="Media inquiries">
        <p>For interviews, quotes, or any other press request, email us at
          <a href="mailto:press@kollects.com" className="text-primary underline"> press@kollects.com</a> and
          we'll get back to you as soon as we can.</p>
      </PageSection>
    </StaticPageLayout>
  );
}
