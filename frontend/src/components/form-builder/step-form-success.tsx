import { Copy, ArrowRight, BarChart3, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { buildFormShareUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function StepFormSuccess() {
  const { successData, reset } = useFormBuilderStore();
  const navigate = useNavigate();
  if (!successData) return null;

  const shareUrl = buildFormShareUrl(successData.shareToken);

  return (
    <div className="mx-auto max-w-xl px-8 py-12 text-center">
      <div className="mb-2 text-primary">
        <CheckCircle2 className="mx-auto h-16 w-16" />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight">Form Created!</h2>
      <p className="text-muted-foreground">Your form is live and ready to share.</p>

      <div className="mx-auto mt-8 w-full max-w-md border border-border bg-secondary/20 p-4">
        <p className="mb-3 text-left text-sm font-medium">Share link</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
          />
          <Button
            variant="secondary"
            className="shrink-0 gap-2"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              toast.success("Link copied!");
            }}
          >
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-md gap-3">
        <Button
          className="flex-1 gap-2"
          onClick={() => {
            const id = successData.formId;
            reset();
            navigate(`/forms/${id}/analytics`);
          }}
        >
          <BarChart3 className="h-4 w-4" /> View Responses
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(shareUrl, "_blank")}>
          <ExternalLink className="h-4 w-4" /> Open Form
        </Button>
      </div>
      <button
        onClick={() => {
          reset();
          navigate("/dashboard/forms");
        }}
        className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        Back to forms <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
