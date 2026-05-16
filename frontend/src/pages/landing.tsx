import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Stats } from "@/components/landing/stats";
import { CTA } from "@/components/landing/cta";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingPage() {
  return (
    <div className="min-h-screen font-sans bg-background selection:bg-primary/20 blueprint-lines relative">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Stats />
        <CTA />
      </main>
      <Footer />
      <ThemeToggle sticky />
    </div>
  );
}