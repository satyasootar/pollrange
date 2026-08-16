import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/use-auth-store";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import { StepUsage } from "@/components/onboarding/step-usage";
import { StepIntent } from "@/components/onboarding/step-intent";
import { StepPlan } from "@/components/onboarding/step-plan";
import { StepFirstAction } from "@/components/onboarding/step-first-action";
import { slideInRight } from "@/lib/animations";

const STEP_COUNT = 4;

export function OnboardingPage() {
  const { user } = useAuthStore();
  const { step } = useOnboardingStore();

  if (user?.hasCompletedOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-8 py-4 md:h-20">
        <h1 className="text-xl font-semibold tracking-tight">Welcome to Kollects</h1>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 transition-colors ${
                i < step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideInRight}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="h-full"
          >
            {step === 1 && <StepUsage />}
            {step === 2 && <StepIntent />}
            {step === 3 && <StepPlan />}
            {step === 4 && <StepFirstAction />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
