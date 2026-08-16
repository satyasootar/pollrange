import { Textarea } from "@/components/ui/textarea";
import { OptionQuestion } from "@/components/onboarding/option-question";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import { USAGE_OPTIONS, USAGE_DETAIL_CONFIG } from "./onboarding-config";

const REVEAL_CLASS = "animate-in fade-in slide-in-from-top-2 duration-300";

export function StepUsage() {
  const { form, setField, nextStep } = useOnboardingStore();
  const detailConfig = form.usage ? USAGE_DETAIL_CONFIG[form.usage] : undefined;

  return (
    <div className="mx-auto max-w-2xl px-8 py-8 space-y-10">
      <OptionQuestion
        title="Where will you use Kollects?"
        subtitle="This helps us tailor your experience."
        options={USAGE_OPTIONS}
        selected={form.usage}
        columns={2}
        onSelect={(value) => {
          setField("usage", value);
          setField("usageDetail", "");
        }}
      />

      {detailConfig && (
        <div className={REVEAL_CLASS}>
          {detailConfig.freeText ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{detailConfig.question}</h2>
              <Textarea
                placeholder="Tell us a bit more"
                rows={3}
                value={form.usageDetail ?? ""}
                onChange={(e) => setField("usageDetail", e.target.value)}
                onBlur={() => {
                  if (form.usageDetail?.trim()) nextStep();
                }}
              />
            </div>
          ) : (
            <OptionQuestion
              title={detailConfig.question}
              options={detailConfig.options!.map((o) => ({ value: o, label: o }))}
              selected={form.usageDetail}
              columns={2}
              onSelect={(value) => {
                setField("usageDetail", value);
                nextStep();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
