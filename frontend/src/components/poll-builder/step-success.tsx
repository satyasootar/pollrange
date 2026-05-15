import { motion } from "framer-motion";
import { Copy, ArrowRight, BarChart3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { fadeUp, stagger } from "@/lib/animations";
import { buildShareUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function StepSuccess() {
  const { successData, reset } = usePollBuilderStore();
  const navigate = useNavigate();

  if (!successData) return null;

  const shareUrl = buildShareUrl(successData.shareToken);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  const handleGoToAnalytics = () => {
    reset();
    navigate(`/polls/${successData.pollId}/analytics`);
  };

  const handleGoToDashboard = () => {
    reset();
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-xl px-8 py-12 text-center">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6 flex flex-col items-center"
      >
        <motion.div variants={fadeUp} className="text-primary mb-2">
          <CheckCircle2 className="h-16 w-16 mx-auto" />
        </motion.div>
        
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Poll Created Successfully!</h2>
          <p className="text-muted-foreground">
            Your poll is now live and ready to be shared with the world.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="w-full max-w-md mt-8 border border-border p-4 rounded-md bg-secondary/20">
          <p className="text-sm font-medium mb-3 text-left">Share Link</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button variant="secondary" onClick={handleCopy} className="shrink-0 gap-2">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="flex gap-4 w-full max-w-md pt-4">
          <Button 
            className="flex-1 gap-2" 
            onClick={handleGoToAnalytics}
          >
            <BarChart3 className="h-4 w-4" />
            View Analytics
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={handleGoToDashboard}
          >
            Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
