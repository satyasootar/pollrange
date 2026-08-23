import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { SectionLabel } from "@/components/landing/shared";
import { cn } from "@/lib/utils";

interface FocusedPageLayoutProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** A short plain-English callout rendered above the content, e.g. "In short: ...". */
  summary?: ReactNode;
  /** Table-of-contents entries; when given, renders a sticky side nav on large screens. */
  toc?: { id: string; label: string }[];
  children: ReactNode;
}

/**
 * A standalone, distraction-free page shell: no marketing navbar, just a back
 * link and the logo. Used for legal documents and the About page, where the
 * usual site nav (Features/How It Works/Sign In) would only be noise.
 */
export function FocusedPageLayout({ icon: Icon, eyebrow, title, subtitle, summary, toc, children }: FocusedPageLayoutProps) {
  const [activeId, setActiveId] = useState<string | null>(toc?.[0]?.id ?? null);

  // Scroll-spy: highlight whichever section's heading is nearest the top of the
  // viewport, so the side nav tracks reading progress as you scroll.
  useEffect(() => {
    if (!toc || toc.length === 0) return;
    const elements = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b));
        setActiveId(topMost.target.id);
      },
      { rootMargin: "-110px 0px -70% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  return (
    <div className="relative min-h-screen bg-background blueprint-lines">
      <div className="mx-auto flex max-w-350 items-center justify-between px-6 pt-8 md:px-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo/logo1.png" alt="Kollects" className="h-6 w-auto object-contain" />
          <span className="text-sm font-black uppercase tracking-tighter">Kollects</span>
        </Link>
      </div>

      {/* Hero — centered, with the divider matched to the same column width so it reads as one unit */}
      <div className="mx-auto max-w-350 px-6 pb-4 pt-16 md:px-12">
        <div className="mx-auto max-w-2xl border-b border-border pb-10 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-primary/30 bg-primary/5 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex justify-center">
            <SectionLabel>{eyebrow}</SectionLabel>
          </div>
          <h1 className="mt-5 text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl">{title}</h1>
          {subtitle && (
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-350 px-6 py-16 md:px-12">
        <div className="mx-auto max-w-4xl space-y-10">
          {summary && (
            <div className="border border-primary/30 bg-primary/5 p-6">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">In short</p>
              <p className="text-sm leading-relaxed text-foreground">{summary}</p>
            </div>
          )}

          {toc && toc.length > 0 ? (
            <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
              <nav className="hidden lg:block">
                <div className="sticky top-16 space-y-1">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">On this page</p>
                  {toc.map((t) => (
                    <a
                      key={t.id}
                      href={`#${t.id}`}
                      className={cn(
                        "block border-l-2 py-1.5 pl-3 text-sm transition-colors",
                        activeId === t.id
                          ? "border-primary font-medium text-foreground"
                          : "border-transparent text-muted-foreground hover:border-primary hover:text-foreground"
                      )}
                    >
                      {t.label}
                    </a>
                  ))}
                </div>
              </nav>
              <div className="space-y-14">{children}</div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-14">{children}</div>
          )}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-350 items-center justify-between px-6 py-6 md:px-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">© 2025 Kollects</p>
          <Link
            to="/"
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

/** A titled, anchor-linkable block of prose for legal/policy content. */
export function FocusedSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
