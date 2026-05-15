import { motion } from "framer-motion";
import { Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { useCreatePoll } from "@/hooks/use-polls";
import { fadeUp, stagger } from "@/lib/animations";
import { formatDatetime } from "@/lib/utils";
import { toast } from "sonner";

import { useNavigate } from "react-router-dom";

export function StepReview() {
  const { form, prevStep, reset } = usePollBuilderStore();
  const createPoll = useCreatePoll();
  const navigate = useNavigate();

  const handlePublish = () => {
    const sanitizedForm = {
      ...form,
      questions: form.questions.map(q => ({
        ...q,
        options: q.type === "open_ended" ? [] : q.options.filter(o => o.text.trim().length > 0)
      }))
    };

    createPoll.mutate(sanitizedForm, {
      onSuccess: (res) => {
        const poll = res.data.data;
        // Reset the store BEFORE navigating so the form is clean for the next use
        reset();
        toast.success("Poll published successfully!");
        navigate(`/polls/${poll._id}/analytics`);
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Review & Publish</h2>
        <p className="text-sm text-muted-foreground">
          Check everything looks right before going live.
        </p>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        {/* Poll meta */}
        <motion.div variants={fadeUp} className="border border-border p-5 space-y-2">
          <h3 className="text-base font-semibold">{form.title}</h3>
          {form.description && (
            <p className="text-sm text-muted-foreground">{form.description}</p>
          )}
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
            <span className="border border-border px-2 py-0.5 capitalize">
              {form.responseMode}
            </span>
            <span className="border border-border px-2 py-0.5">
              Expires: {formatDatetime(form.expiresAt)}
            </span>
            <span className="border border-border px-2 py-0.5">
              {form.questions.length} question{form.questions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </motion.div>

        {/* Questions preview */}
        {form.questions.map((q, qi) => (
          <motion.div
            key={q.id}
            variants={fadeUp}
            className="border border-border p-5 space-y-3"
          >
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">
                Q{qi + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {q.text}
                  {q.isMandatory && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </p>
                {q.type === "single_choice" ? (
                  <ul className="mt-2 space-y-1">
                    {q.options.map((o, oi) => (
                      <li key={o.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                        {o.text || `Option ${oi + 1}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground italic">Open-ended text response</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          ← Edit Questions
        </Button>
        <Button
          onClick={handlePublish}
          disabled={createPoll.isPending}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {createPoll.isPending ? "Creating…" : "Publish Poll"}
        </Button>
      </div>
    </div>
  );
}
