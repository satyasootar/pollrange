import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { OptionQuestion } from "@/components/onboarding/option-question";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/use-auth-store";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import { FIRST_ACTION_OPTIONS } from "./onboarding-config";

export function StepFirstAction() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const { form, setField, prevStep } = useOnboardingStore();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      authApi.completeOnboarding({
        usage: form.usage!,
        usageDetail: form.usageDetail,
        intent: form.intent!,
        plan: form.plan!,
        firstAction: form.firstAction!,
      }),
    onSuccess: (res) => {
      setUser(res.data.data.user);
      navigate("/dashboard", { replace: true });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-8 py-8 space-y-8">
      <OptionQuestion
        title="What would you like to do first?"
        options={FIRST_ACTION_OPTIONS}
        selected={form.firstAction}
        columns={2}
        onSelect={(value) => setField("firstAction", value)}
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
        <Button type="button" disabled={!form.firstAction || isPending} onClick={() => mutate()}>
          {isPending ? "Finishing…" : "Finish"}
        </Button>
      </div>
    </div>
  );
}
