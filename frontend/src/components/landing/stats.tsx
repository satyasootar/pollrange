import { motion } from "framer-motion";
import { SectionLabel, StatCard } from "./shared";
import { fadeUp, stagger } from "@/lib/animations";

export function Stats() {
  return (
    <section id="stats" className="border-b border-border">
      <div className="max-w-[1400px] mx-auto px-12 py-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-16 text-center">
            <SectionLabel>By The Numbers</SectionLabel>
            <h2 className="mt-5 text-4xl font-black uppercase tracking-tight">Built for scale</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            <div className="bg-background"><StatCard value="10K+" label="Polls Created" /></div>
            <div className="bg-background"><StatCard value="500K+" label="Responses Collected" /></div>
            <div className="bg-background"><StatCard value="< 50ms" label="Real-time Latency" /></div>
            <div className="bg-background"><StatCard value="99.9%" label="Uptime SLA" /></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
