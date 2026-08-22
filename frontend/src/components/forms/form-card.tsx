import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MoreHorizontal,
  BarChart3,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  Radio,
  RotateCcw,
  Files,
  Lock,
  Award,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Form, PollStatus } from "@/types";
import { buildFormShareUrl, copyToClipboard, formatDate } from "@/lib/utils";
import { useDeleteForm, useDuplicateForm, useCloseForm, useReopenForm } from "@/hooks/use-forms";
import { toast } from "sonner";
import { cardHover } from "@/lib/animations";

const STATUS_CONFIG: Record<PollStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400" },
  active: { label: "Active", className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" },
  closed: { label: "Closed", className: "border-border bg-muted text-muted-foreground" },
  published: { label: "Published", className: "border-primary/40 bg-primary/10 text-primary" },
};

export function FormCard({ form }: { form: Form }) {
  const navigate = useNavigate();
  const deleteForm = useDeleteForm();
  const duplicateForm = useDuplicateForm();
  const closeForm = useCloseForm(form._id);
  const reopenForm = useReopenForm(form._id);
  const statusCfg = STATUS_CONFIG[form.status];
  const shareUrl = buildFormShareUrl(form.shareToken);
  const questionCount = form.sections.reduce((n, s) => n + s.questions.length, 0);

  const handleDelete = () => {
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    deleteForm.mutate(form._id);
  };

  return (
    <motion.div
      className="group flex flex-col border border-border bg-card shadow-none hover:border-primary/50 cursor-pointer"
      initial="rest"
      whileHover="hover"
      variants={cardHover}
      onClick={() => navigate(`/forms/${form._id}/analytics`)}
    >
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="min-w-0 flex-1 pr-2">
          {form.isQuiz && (
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Award className="h-3 w-3" /> Quiz
            </div>
          )}
          <h3 className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
            {form.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}>
            {form.status === "active" && <Radio className="mr-1 h-2.5 w-2.5 animate-pulse" />}
            {statusCfg.label}
          </span>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/forms/${form._id}/analytics`)}>
                  <BarChart3 className="mr-2 h-4 w-4" /> View Responses
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await copyToClipboard(shareUrl);
                    toast.success("Share link copied!");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy Share Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`/f/${form.shareToken}`, "_blank")}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Open Form
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/forms/${form._id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateForm.mutate(form._id)}>
                  <Files className="mr-2 h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                {form.status === "active" && (
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm("Close this form? It will stop accepting responses.")) closeForm.mutate();
                    }}
                  >
                    <Lock className="mr-2 h-4 w-4" /> Close Form
                  </DropdownMenuItem>
                )}
                {form.status === "closed" && (
                  <DropdownMenuItem onClick={() => reopenForm.mutate(null)}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Reopen Form
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 pb-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5" />
          {form.totalResponses} response{form.totalResponses !== 1 ? "s" : ""}
        </span>
        <span>•</span>
        <span>{questionCount} question{questionCount !== 1 ? "s" : ""}</span>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">Created {formatDate(form.createdAt)}</span>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => navigate(`/forms/${form._id}/analytics`)}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Responses
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
