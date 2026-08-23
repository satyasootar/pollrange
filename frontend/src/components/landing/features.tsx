import { motion } from "framer-motion";
import { Zap, ShieldCheck, Globe, BarChart3, Clock, FileText, Award, Upload } from "lucide-react";
import { SectionLabel, FeatureCard } from "./shared";
import { fadeUp, stagger } from "@/lib/animations";

export function Features() {
  return (
    <section id="features" className="border-b border-border">
      <div className="max-w-350 mx-auto px-12 py-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-16 flex items-end justify-between flex-wrap gap-6">
            <div>
              <SectionLabel>Features</SectionLabel>
              <h2 className="mt-5 text-5xl font-black uppercase tracking-tight leading-none">
                Everything you<br />need to ask.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Polls, forms, and quizzes, all in one place. Built for anyone who wants fast,
              honest feedback from their audience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-border">
            <FeatureCard icon={Zap} label="Core" title="Instant Results" desc="Votes appear right away. No page refresh, no waiting." />
            <FeatureCard icon={FileText} label="Forms" title="Forms & Surveys" desc="An easy form builder with many question types, sections, grids, and validation." />
            <FeatureCard icon={Award} label="Quizzes" title="Auto-Graded Quizzes" desc="Mark the correct answers, assign points, and scores are ready the moment someone submits." />
            <FeatureCard icon={BarChart3} label="Insights" title="Unified Dashboard" desc="See every poll and form in one place, with trends and top results. Download your data anytime." />
            <FeatureCard icon={Clock} label="Analytics" title="Granular Timelines" desc="See responses over time by the minute, hour, day, week, or month." />
            <FeatureCard icon={Upload} label="Media" title="File Uploads" desc="Collect images and documents. They upload in the background while people fill out the form." />
            <FeatureCard icon={ShieldCheck} label="Security" title="Anonymous Mode" desc="Let people answer without logging in, or require sign-in. You choose for each poll or form." />
            <FeatureCard icon={Globe} label="Sharing" title="Share Anywhere" desc="Share a link or QR code. Publish clean, read-only results when you're ready." />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
