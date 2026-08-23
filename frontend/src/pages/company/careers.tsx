import { Heart, Rocket, Globe2 } from "lucide-react";
import { StaticPageLayout } from "@/components/layout/static-page-layout";

const VALUES = [
  { icon: Rocket, title: "Small team, real impact", desc: "Every person's work ships and gets used, there's no getting lost in a big org chart." },
  { icon: Globe2, title: "Work from anywhere", desc: "We care about the work you do, not which chair you're sitting in when you do it." },
  { icon: Heart, title: "Build things people actually use", desc: "We'd rather ship something simple that helps people than something impressive that doesn't." },
];

export function CareersPage() {
  return (
    <StaticPageLayout
      eyebrow="Company"
      title="Careers"
      subtitle="We're a small team building Kollects. Here's what that's like, and how to reach us."
    >
      <div className="grid gap-6 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.title} className="border border-border p-6">
            <v.icon className="mb-4 h-5 w-5 text-primary" />
            <h3 className="mb-2 text-sm font-black uppercase tracking-tight">{v.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </div>

      <div className="border border-border p-8">
        <h2 className="mb-3 text-lg font-black uppercase tracking-tight">No open roles right now</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We don't have any open positions at the moment. We're a small team and we grow
          carefully. If that changes, we'll list roles here. In the meantime, if you're
          excited about what we're building and think you could help, feel free to reach
          out and introduce yourself at{" "}
          <a href="mailto:careers@kollects.com" className="text-primary underline">careers@kollects.com</a>.
          We read every message, even if we can't reply to all of them right away.
        </p>
      </div>
    </StaticPageLayout>
  );
}
