import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SectionLabel } from "./shared";
import { fadeUp, stagger } from "@/lib/animations";

export function CTA() {
  return (
    <section className="border-b border-border">
      <div className="max-w-[1400px] mx-auto px-12 py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="border border-border p-12 md:p-20 relative overflow-hidden"
        >
          {/* Subtle background grid */}
          <div className="absolute inset-0 bg-grid-dots opacity-30 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-12">
            <div>
              <motion.div variants={fadeUp}>
                <SectionLabel>Start Free</SectionLabel>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="mt-5 text-5xl md:text-6xl font-black uppercase tracking-tight leading-none">
                Ready to hear<br />your audience?
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="mt-6 text-muted-foreground max-w-md leading-relaxed">
                Create your first poll in under 60 seconds. No credit card. No limits on responses.
                Just honest insights from the people who matter.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap gap-3">
                {["No credit card", "Unlimited responses", "Real-time analytics"].map((t) => (
                  <span key={t} className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {t}
                  </span>
                ))}
              </motion.div>
            </div>
            <motion.div variants={fadeUp} custom={2} className="flex-shrink-0">
              <Link to="/auth/register">
                <Button
                  size="lg"
                  className="h-16 px-12 rounded-none bg-foreground text-background hover:bg-primary text-base font-black uppercase tracking-widest transition-all"
                >
                  Create Your Poll <ArrowRight className="ml-3 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
