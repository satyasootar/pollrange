import { motion } from "framer-motion";
import { Zap, ShieldCheck, Globe, BarChart3, Clock, Users, Share2, TrendingUp } from "lucide-react";
import { SectionLabel, FeatureCard } from "./shared";
import { fadeUp, stagger } from "@/lib/animations";

export function Features() {
  return (
    <section id="features" className="border-b border-border">
      <div className="max-w-[1400px] mx-auto px-12 py-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-16 flex items-end justify-between flex-wrap gap-6">
            <div>
              <SectionLabel>Features</SectionLabel>
              <h2 className="mt-5 text-5xl font-black uppercase tracking-tight leading-none">
                Everything you<br />need to poll.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Built for creators, researchers, educators, and teams who need honest, fast,
              and beautiful audience feedback.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-border">
            <FeatureCard icon={Zap} label="Core" title="Instant Results" desc="Votes appear in real-time via Socket.io — no page refresh, no lag." />
            <FeatureCard icon={ShieldCheck} label="Security" title="Anonymous Mode" desc="Allow anonymous responses or require authentication — your choice per poll." />
            <FeatureCard icon={Globe} label="Sharing" title="Share Anywhere" desc="Unique shareable link and QR code. Embed on any website in seconds." />
            <FeatureCard icon={BarChart3} label="Insights" title="Deep Analytics" desc="Participation rates, option breakdowns, completion trends — export to CSV." />
            <FeatureCard icon={Clock} label="Control" title="Auto-Expiry" desc="Set a deadline and the poll closes itself. Results published on your terms." />
            <FeatureCard icon={Users} label="Reach" title="Multi-Audience" desc="No account required for respondents. Anyone with the link can vote instantly." />
            <FeatureCard icon={Share2} label="Embed" title="Publish Results" desc="Make results public after closing. Share a beautiful read-only results page." />
            <FeatureCard icon={TrendingUp} label="Visual" title="Word Cloud" desc="Visualize response trends as a word cloud — great for open-ended insights." />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
