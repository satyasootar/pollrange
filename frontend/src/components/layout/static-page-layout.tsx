import type { ReactNode } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { SectionLabel } from "@/components/landing/shared";

interface StaticPageLayoutProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Shared shell for marketing/legal pages: Navbar + a title block + Footer. */
export function StaticPageLayout({ eyebrow, title, subtitle, children }: StaticPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-350 mx-auto px-6 py-20 md:px-12">
        <div className="max-w-2xl">
          {eyebrow && <SectionLabel>{eyebrow}</SectionLabel>}
          <h1 className="mt-5 text-4xl font-black uppercase tracking-tight leading-none md:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="mt-14 max-w-2xl space-y-12">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

/** A titled block of prose, used for legal/policy sections. */
export function PageSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black uppercase tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
