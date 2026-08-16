import { motion } from "framer-motion";
import { SectionLabel, StepCard } from "./shared";
import { fadeUp, stagger } from "@/lib/animations";

export function HowItWorks() {
  return (
    <section id="how" className="border-b border-border bg-muted/20">
      <div className="max-w-350 mx-auto px-12 py-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-16">
            <SectionLabel>How It Works</SectionLabel>
            <h2 className="mt-5 text-5xl font-black uppercase tracking-tight leading-none">
              Three steps.<br />Zero friction.
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
            <div className="bg-background p-12">
              <StepCard num="01" title="Build It" desc="Sign up free. Create a poll, a multi-section form, or an auto-graded quiz — 12 question types, grids, file uploads, and validation. Set expiry, anonymous mode, and sharing rules." />
            </div>
            <div className="bg-background p-12">
              <StepCard num="02" title="Share Instantly" desc="Copy your unique link or QR code. Share via email, social media, or embed it on your site. Respondents don't need an account to vote." />
            </div>
            <div className="bg-background p-12">
              <StepCard num="03" title="Watch Results Live" desc="A unified dashboard updates in real-time across every poll and form — response timelines, breakdowns, and top performers. Publish results publicly or keep them private." />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
