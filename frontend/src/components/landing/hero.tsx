import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { SectionLabel } from "./shared";
import { fadeUp, stagger } from "@/lib/animations";
import { config } from "@/config/config";
import { LandingDashboard } from "./landing-dashboard";

export function Hero() {
  return (
    <section className="relative border-b border-border">
      <div className="max-w-[1400px] mx-auto px-12 pt-12 pb-32">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} custom={0}>
            <SectionLabel><Zap className="w-3 h-3" /> Real-time audience polling</SectionLabel>
          </motion.div>

          <motion.h1
            variants={fadeUp} custom={1}
            className="mt-4 text-[clamp(3rem,9vw,6rem)] font-black uppercase tracking-[-0.03em] leading-[0.88] max-w-4xl"
          >
            Capture the{" "}
            <span className="text-primary italic">Choice</span>{" "}
            of your{" "}
            <span className="relative inline-block">
              Audience
              <span className="absolute -bottom-2 left-0 right-0 h-[3px] bg-primary" />
            </span>
            .
          </motion.h1>

          <motion.p
            variants={fadeUp} custom={2}
            className="mt-10 text-base text-muted-foreground max-w-xl leading-relaxed font-medium"
          >
            PollRange lets you build multi-question polls, share them instantly, and watch
            responses flow in live — with real-time analytics your audience can trust.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-12 flex flex-wrap items-center gap-4">
            <Link to="/auth/register">
              <Button
                size="lg"
                className="h-14 px-8 rounded-none bg-foreground text-background hover:bg-primary text-sm font-black uppercase tracking-widest transition-all"
              >
                Create Free Poll <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 rounded-none border-border text-sm font-bold uppercase tracking-widest hover:bg-muted transition-all"
              >
                See Features
              </Button>
            </a>
          </motion.div>

          {/* Hero visual — production dashboard preview */}
          <motion.div
            variants={fadeUp} custom={4}
            className="mt-20 relative group/hero"
          >
            <LandingDashboard />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
