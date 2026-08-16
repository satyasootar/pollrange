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
              Polls, forms, and quizzes in one place — for creators, researchers, educators,
              and teams who need honest, fast, and beautiful audience feedback.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-border">
            <FeatureCard icon={Zap} label="Core" title="Instant Results" desc="Votes appear in real-time via Socket.io — no page refresh, no lag." />
            <FeatureCard icon={FileText} label="Forms" title="Forms & Surveys" desc="Google-Forms-style builder: 12 question types, sections, grids, and validation." />
            <FeatureCard icon={Award} label="Quizzes" title="Auto-Graded Quizzes" desc="Mark correct answers, assign points, and release scores the moment they submit." />
            <FeatureCard icon={BarChart3} label="Insights" title="Unified Dashboard" desc="One overview across every poll and form — trends, splits, and top performers. Export to CSV." />
            <FeatureCard icon={Clock} label="Analytics" title="Granular Timelines" desc="Slice responses over time by minute, hour, day, week, or month." />
            <FeatureCard icon={Upload} label="Media" title="File Uploads" desc="Collect images and documents — uploaded in the background as respondents fill in." />
            <FeatureCard icon={ShieldCheck} label="Security" title="Anonymous Mode" desc="Allow anonymous responses or require authentication — your choice per poll or form." />
            <FeatureCard icon={Globe} label="Sharing" title="Share Anywhere" desc="Unique link and QR code. Publish beautiful read-only results when you're ready." />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
