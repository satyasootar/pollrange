import React from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-primary border border-primary/30 bg-primary/5 px-3 py-1">
      {children}
    </span>
  );
}

export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className="border border-border p-8 flex flex-col gap-2 hover:border-primary/40 transition-colors"
    >
      <span className="text-4xl font-black tracking-tighter text-foreground">{value}</span>
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
    </motion.div>
  );
}

export function FeatureCard({
  icon: Icon, label, title, desc,
}: {
  icon: React.ElementType; label: string; title: string; desc: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="group border-r border-b border-border p-10 hover:bg-muted/40 transition-colors relative"
    >
      <div className="flex items-start justify-between mb-8">
        <div className="w-11 h-11 border border-foreground/20 flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <h3 className="text-xl font-black uppercase tracking-tight mb-3">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export function StepCard({
  num, title, desc,
}: {
  num: string; title: string; desc: string;
}) {
  return (
    <motion.div variants={fadeUp} className="relative">
      <div className="font-mono text-[80px] font-black text-foreground/5 leading-none select-none absolute -top-6 left-0">{num}</div>
      <div className="relative border border-border p-8 hover:border-primary/40 transition-colors">
        <span className="font-mono text-xs text-primary mb-4 block">STEP {num}</span>
        <h3 className="text-lg font-black uppercase tracking-tight mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}
