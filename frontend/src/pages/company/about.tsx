import { Link } from "react-router-dom";
import { Zap, ShieldCheck, Users } from "lucide-react";
import { StaticPageLayout } from "@/components/layout/static-page-layout";
import { Button } from "@/components/ui/button";

const VALUES = [
  {
    icon: Zap,
    title: "Fast, by default",
    desc: "Creating a poll or form should take minutes, and results should update the moment someone answers, not after a page refresh.",
  },
  {
    icon: Users,
    title: "Built for real feedback",
    desc: "We design for honest answers: simple wording, no dark patterns, and clear choices between anonymous and sign-in-required responses.",
  },
  {
    icon: ShieldCheck,
    title: "Careful with data",
    desc: "Your questions and your respondents' answers belong to you. We only collect what we need to run the product, explained plainly in our Privacy Policy.",
  },
];

export function AboutPage() {
  return (
    <StaticPageLayout
      eyebrow="Company"
      title="About Kollects"
      subtitle="Kollects helps people and teams ask questions and get real answers, fast."
    >
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          Most feedback tools make you choose between simple and powerful. Kollects is
          built to be both: a poll builder for quick yes-or-no questions, a form builder for
          longer surveys and applications, and a quiz builder that grades itself, all in one
          place, with results you can watch update live.
        </p>
        <p>
          We started Kollects because collecting an opinion, whether from a classroom, a
          team, or a community, shouldn't take a spreadsheet and a headache. So we built the
          tool we wanted to use ourselves.
        </p>
      </div>

      <div>
        <h2 className="mb-6 text-lg font-black uppercase tracking-tight">What we care about</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="border border-border p-6">
              <v.icon className="mb-4 h-5 w-5 text-primary" />
              <h3 className="mb-2 text-sm font-black uppercase tracking-tight">{v.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border p-8 text-center">
        <h2 className="mb-2 text-lg font-black uppercase tracking-tight">Want to see it for yourself?</h2>
        <p className="mb-6 text-sm text-muted-foreground">Create a free poll or form in under a minute.</p>
        <Link to="/auth/register">
          <Button size="lg" className="rounded-none">Get Started</Button>
        </Link>
      </div>
    </StaticPageLayout>
  );
}
