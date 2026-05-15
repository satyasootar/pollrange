import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { useUpdatePoll } from "@/hooks/use-polls";
import { fadeUp, stagger } from "@/lib/animations";
import { formatDatetime } from "@/lib/utils";

export function StepReviewEdit({ pollId }: { pollId: string }) {
  const { form, prevStep, reset } = usePollBuilderStore();
  const updatePoll = useUpdatePoll(pollId);
  const navigate = useNavigate();

  const handleSave = () => {
    updatePoll.mutate(form, {
      onSuccess: () => {
        reset();
        navigate(`/polls/${pollId}/analytics`);
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Review Changes</h2>
        <p className="text-sm text-muted-foreground">
          Verify your changes before saving.
        </p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
        <motion.div variants={fadeUp} className="border border-border p-5 space-y-2">
          <h3 className="text-base font-semibold">{form.title}</h3>
          {form.description && (
            <p className="text-sm text-muted-foreground">{form.description}</p>
          )}
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
            <span className="border border-border px-2 py-0.5 capitalize">{form.responseMode}</span>
            <span className="border border-border px-2 py-0.5">
              Expires: {formatDatetime(form.expiresAt)}
            </span>
            <span className="border border-border px-2 py-0.5">
              {form.questions.length} question{form.questions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </motion.div>

        {form.questions.map((q, qi) => (
          <motion.div key={q.id} variants={fadeUp} className="border border-border p-5">
            <p className="text-sm font-medium">
              Q{qi + 1}: {q.text}
              {q.isMandatory && <span className="ml-1 text-destructive">*</span>}
            </p>
            {q.type === "single_choice" && (
              <ul className="mt-2 space-y-1">
                {q.options.map((o, oi) => (
                  <li key={o.id} className="text-xs text-muted-foreground">• {o.text || `Option ${oi + 1}`}</li>
                ))}
              </ul>
            )}
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={prevStep}>← Edit Questions</Button>
        <Button onClick={handleSave} disabled={updatePoll.isPending}>
          {updatePoll.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
