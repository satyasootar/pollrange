import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveUpgradeIntent } from "@/lib/upgrade-intent";
import { motion } from "framer-motion";
import { SectionLabel } from "./shared";
import { fadeUp, stagger } from "@/lib/animations";
import { useAuthStore } from "@/store/use-auth-store";
import { usePlans } from "@/hooks/use-plan";
import { PlanCards, PeriodToggle, type BillingPeriod } from "@/components/billing/plan-cards";
import { cn } from "@/lib/utils";

export function Pricing() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: plans, isError } = usePlans();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  // The catalog comes from the API; if it's unreachable, skip the section rather than show stale prices.
  if (isError) return null;

  return (
    <section id="pricing" className="border-b border-border">
      <div className="mx-auto max-w-350 px-4 py-24 md:px-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <SectionLabel>Pricing</SectionLabel>
              <h2 className="mt-5 text-4xl font-black uppercase leading-none tracking-tight md:text-5xl">
                Generous by default.
                <br />
                Pay when you grow.
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
                Every plan gets quizzes, branching, UPI payments, live analytics and CSV export. Paid plans add volume and your own
                branding. Prices in INR.
              </p>
            </div>
            <PeriodToggle value={period} onChange={setPeriod} />
          </motion.div>

          <motion.div variants={fadeUp} custom={1}>
            {plans ? (
              <PlanCards
                plans={plans}
                period={period}
                highlight="plus"
                action={(p) => {
                  const cls = cn(
                    "flex h-10 w-full items-center justify-center px-3 text-center font-mono text-[11px] uppercase tracking-widest transition-colors",
                    p.id === "plus" ? "bg-foreground text-background hover:bg-primary" : "border border-border hover:bg-foreground hover:text-background"
                  );
                  if (p.id === "free") {
                    return (
                      <Link to={user ? "/dashboard" : "/auth/register"} className={cls}>
                        {user ? "Go to dashboard" : "Start free"}
                      </Link>
                    );
                  }
                  return (
                    <button
                      type="button"
                      className={cls}
                      onClick={() => {
                        // Remembered through sign-up; filed as a request once they're in the app.
                        saveUpgradeIntent({ plan: p.id as "plus" | "pro", period });
                        navigate(user ? "/dashboard/billing" : "/auth/register");
                      }}
                    >
                      Get {p.label}
                    </button>
                  );
                }}
              />
            ) : (
              <div className="shimmer h-[28rem]" />
            )}
          </motion.div>

          <motion.p variants={fadeUp} custom={2} className="mt-6 font-mono text-xs text-muted-foreground">
            Paid plans: create an account, and we'll review your request and switch you over (you can use Free meanwhile). Respondents
            never need an account.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
