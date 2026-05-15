import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { SectionLabel } from "./shared";
import { fadeUp, stagger } from "@/lib/animations";

export function Hero() {
  return (
    <section className="relative border-b border-border">
      <div className="max-w-[1400px] mx-auto px-12 pt-24 pb-32">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} custom={0}>
            <SectionLabel><Zap className="w-3 h-3" /> Real-time audience polling</SectionLabel>
          </motion.div>

          <motion.h1
            variants={fadeUp} custom={1}
            className="mt-8 text-[clamp(3rem,9vw,7.5rem)] font-black uppercase tracking-[-0.03em] leading-[0.88] max-w-4xl"
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

          {/* Hero visual — mock dashboard */}
          <motion.div
            variants={fadeUp} custom={4}
            className="mt-20 border border-border bg-card relative"
          >
            <div className="border-b border-border px-5 py-3 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              <span className="ml-4 font-mono text-[11px] text-muted-foreground">pollrange.app / dashboard</span>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-green-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Poll preview */}
              <div className="p-8 col-span-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-5">Active Poll — Q2 Product Survey</p>
                <div className="space-y-3">
                  {[
                    { label: "Improved performance", pct: 72 },
                    { label: "Better mobile UX", pct: 54 },
                    { label: "More integrations", pct: 38 },
                    { label: "Lower pricing", pct: 21 },
                  ].map((opt) => (
                    <div key={opt.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium">{opt.label}</span>
                        <span className="text-xs font-mono text-muted-foreground">{opt.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted w-full">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${opt.pct}%` }}
                          transition={{ duration: 1.2, ease: "easeOut", delay: 0.8 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Stats sidebar */}
              <div className="p-8 space-y-6">
                {[
                  { label: "Responses", value: "1,284" },
                  { label: "Completion", value: "91.4%" },
                  { label: "Active now", value: "37" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-black mt-1">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
