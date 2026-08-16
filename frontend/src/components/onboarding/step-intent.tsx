import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionQuestion } from "@/components/onboarding/option-question";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import { INTENT_OPTIONS } from "./onboarding-config";

export function StepIntent() {
  const { form, setField, nextStep, prevStep } = useOnboardingStore();

  return (
    <div className="mx-auto max-w-2xl px-8 py-8 space-y-8">
      <OptionQuestion
        title="What brings you here today?"
        options={INTENT_OPTIONS}
        selected={form.intent}
        onSelect={(value) => setField("intent", value)}
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <Button type="button" disabled={!form.intent} onClick={nextStep}>
          Next →
        </Button>
      </div>
    </div>
  );
}
