import { Link } from "react-router-dom";
import { Users, Zap, ShieldCheck, ArrowRight, BarChart3, FileText, Award } from "lucide-react";
import { FocusedPageLayout } from "@/components/layout/focused-page-layout";
import { Button } from "@/components/ui/button";

const TOOLS = [
  { icon: BarChart3, title: "Polls", desc: "A single question, shared in seconds. Best for quick votes and gut-check decisions." },
  { icon: FileText, title: "Forms", desc: "Multi-section surveys, applications, and sign-ups, with file uploads and validation." },
  { icon: Award, title: "Quizzes", desc: "Graded automatically, so you can test knowledge without marking a single answer by hand." },
];

const VALUES = [
  {
    icon: Zap,
    title: "Fast, by default",
    desc: "Creating a poll or form should take minutes, and results should update the moment someone answers, not after a page refresh.",
  },
  {
    icon: Users,
    title: "Built for real feedback",
    desc: "We design for honest answers: simple wording, no dark patterns, and a clear choice between anonymous and sign-in-required responses.",
  },
  {
    icon: ShieldCheck,
    title: "Careful with data",
    desc: "Your questions and your respondents' answers belong to you. We only collect what we need to run the product, explained plainly in our Privacy Policy.",
  },
];

export function AboutPage() {
  return (
    <FocusedPageLayout
      icon={Users}
      eyebrow="Company"
      title="About Kollects"
      subtitle="We help people and teams ask questions and get real answers, fast."
    >
      <blockquote className="border-l-2 border-primary py-1 pl-6 text-xl font-medium leading-relaxed text-foreground md:text-2xl">
        Most feedback tools make you choose between simple and powerful. Kollects is built
        to be both.
      </blockquote>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          A poll builder for quick yes-or-no questions, a form builder for longer surveys and
          applications, and a quiz builder that grades itself, all in one place, with results
          you can watch update live.
        </p>
        <p>
          We started Kollects because collecting an opinion, whether from a classroom, a
          team, or a community, shouldn't take a spreadsheet and a headache. So we built the
          tool we wanted to use ourselves.
        </p>
      </div>

      <div>
        <h2 className="mb-6 text-lg font-black uppercase tracking-tight">Three tools, one place</h2>
        <div className="space-y-4">
          {TOOLS.map((t) => (
            <div key={t.title} className="flex items-start gap-4 border border-border p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-foreground/20 text-primary">
                <t.icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-black uppercase tracking-tight">{t.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Every result, from every poll, form, and quiz, lands in one dashboard, updated
          live, so you're never refreshing a page to see what people said.
        </p>
      </div>

      <div>
        <h2 className="mb-6 text-lg font-black uppercase tracking-tight">What we care about</h2>
        <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="group bg-background p-6 transition-colors hover:bg-muted/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center border border-foreground/20 text-muted-foreground transition-colors group-hover:border-primary group-hover:text-primary">
                <v.icon className="h-4 w-4" />
              </div>
              <h3 className="mb-2 text-sm font-black uppercase tracking-tight">{v.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden border border-border p-10 text-center">
        <div className="absolute inset-0 bg-grid-dots opacity-30" />
        <div className="relative">
          <h2 className="mb-2 text-2xl font-black uppercase tracking-tight">See it for yourself</h2>
          <p className="mb-6 text-sm text-muted-foreground">Create a free poll or form in under a minute.</p>
          <Link to="/auth/register">
            <Button size="lg" className="gap-2 rounded-none">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </FocusedPageLayout>
  );
}
