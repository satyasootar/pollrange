import { StaticPageLayout } from "@/components/layout/static-page-layout";

const POSTS = [
  {
    date: "January 2026",
    title: "Getting started with Kollects",
    body: [
      "Creating your first poll takes three steps: give it a title, add your questions, and share the link. You don't need to set up anything else. Responses show up on your dashboard the moment someone answers.",
      "If you need something more detailed than a quick poll, forms let you add sections, file uploads, and even auto-graded quizzes. Start simple, and add more as you need it.",
    ],
  },
  {
    date: "January 2026",
    title: "5 tips for writing better survey questions",
    body: [
      "1. Ask one thing at a time. A question like \"Was the event fun and well organized?\" is really two questions. Split it up.",
      "2. Keep it short. Long, jargon-heavy questions get skipped or misread.",
      "3. Avoid leading questions. \"How great was our support team?\" assumes the answer. Ask \"How would you rate our support team?\" instead.",
      "4. Make it easy to answer. Multiple choice and rating scales get more responses than open text.",
      "5. Always test it yourself first. If a question confuses you, it will confuse your respondents too.",
    ],
  },
  {
    date: "January 2026",
    title: "Anonymous vs. sign-in-required responses: which should you choose?",
    body: [
      "Anonymous responses are best when you want honest, unfiltered feedback, such as employee satisfaction surveys or event feedback. People are more willing to share their real opinion when their name isn't attached.",
      "Sign-in-required responses make sense when you need to know who answered, such as class quizzes, RSVPs, or internal team decisions. Kollects lets you choose the setting per poll or form, so you can pick the right one for each situation.",
    ],
  },
];

export function BlogPage() {
  return (
    <StaticPageLayout
      eyebrow="Company"
      title="Blog"
      subtitle="Short, practical notes on getting better feedback and results."
    >
      <div className="space-y-14">
        {POSTS.map((post) => (
          <article key={post.title} className="border-b border-border pb-10 last:border-0 last:pb-0">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{post.date}</p>
            <h2 className="mb-4 text-2xl font-black uppercase tracking-tight">{post.title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {post.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </StaticPageLayout>
  );
}
