import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share2, X, Camera, Check, Copy } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { FullAnalytics } from "@/types";
import { cn } from "@/lib/utils";

interface SnapshotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: FullAnalytics;
  shareUrl: string;
}

export function SnapshotDialog({
  isOpen,
  onClose,
  analytics,
  shareUrl,
}: SnapshotDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    
    try {
      // Small delay to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: "transparent",
        pixelRatio: 2, // High quality
      });
      
      const link = document.createElement("a");
      link.download = `poll-snapshot-${analytics.pollTitle.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success("Snapshot downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate snapshot image");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast.success("Share link copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-none border-border p-0 sm:max-w-3xl">
        <div className="flex flex-col md:flex-row">
          {/* Preview Area */}
          <div className="flex-1 bg-muted/30 p-6 md:p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-border overflow-auto max-h-[60vh] md:max-h-none">
            {/* The Actual Card to capture */}
            <div 
              ref={cardRef}
              className="relative w-[400px] overflow-hidden bg-background border border-border shadow-2xl"
              style={{ padding: '0' }}
            >
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--foreground) 1px, transparent 0)', backgroundSize: '24px 24px' }} 
              />
              
              {/* Branding Header */}
              <div className="bg-primary/5 border-b border-border p-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center bg-primary">
                    <img src="/logo/logo1.png" alt="PollRange" className="h-6 w-auto" />
                  </div>
                  <span className="font-bold tracking-tighter text-foreground text-xl uppercase">PollRange</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">Result Snapshot</p>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-8 space-y-8">
                <div>
                  <h2 className="text-2xl font-black leading-tight tracking-tight text-foreground">
                    {analytics.pollTitle}
                  </h2>
                  <div className="mt-4 flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responses</span>
                      <span className="text-xl font-bold text-primary">{analytics.totalResponses}</span>
                    </div>
                    <div className="flex flex-col border-l border-border pl-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Completion</span>
                      <span className="text-xl font-bold text-foreground">{analytics.completionRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Question Highlights (Top 2) */}
                <div className="space-y-6">
                  {analytics.questions.slice(0, 2).map((q) => (
                    <div key={q.questionId} className="space-y-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="h-1 w-4 bg-primary/40" />
                        {q.questionText}
                      </p>
                      {q.type === "single_choice" ? (
                        <div className="space-y-2">
                          {q.options.slice(0, 3).map((opt, i) => (
                            <div key={opt.optionId} className="relative h-7 w-full border border-border/40 bg-muted/10">
                              <div 
                                className={cn("absolute inset-y-0 left-0 transition-all duration-1000", i === 0 ? "bg-primary/20" : "bg-muted/30")}
                                style={{ width: `${opt.percentage}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] font-medium">
                                <span className="truncate pr-4">{opt.optionText}</span>
                                <span className="font-bold">{opt.percentage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-border/40 bg-muted/5 p-4 italic text-center">
                          <p className="text-[11px] text-muted-foreground">Open-ended results available online</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border p-6 bg-muted/5 flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Scan to vote or view</p>
                  <p className="text-[10px] font-mono text-muted-foreground/80 truncate max-w-[200px]">{shareUrl.replace(/^https?:\/\//, '')}</p>
                </div>
                {/* Visual placeholder for QR code or similar */}
                <div className="h-12 w-12 border border-border p-1 bg-white flex items-center justify-center">
                   <div className="w-full h-full bg-black/5 flex items-center justify-center">
                      <Share2 className="h-5 w-5 text-black/20" />
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Area */}
          <div className="flex w-full flex-col p-6 md:w-72 lg:p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-bold uppercase tracking-tight">Share Results</DialogTitle>
              <DialogDescription>
                Download a high-quality snapshot or copy the results link.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Button 
                onClick={handleDownload} 
                disabled={isDownloading}
                className="w-full h-12 rounded-none gap-2 font-bold uppercase tracking-wider"
              >
                {isDownloading ? (
                   <span className="flex items-center gap-2">
                     <div className="h-4 w-4 animate-spin border-2 border-primary-foreground border-t-transparent" />
                     Generating...
                   </span>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Download PNG
                  </>
                )}
              </Button>

              <Button 
                variant="outline" 
                onClick={handleCopyLink}
                className="w-full h-12 rounded-none gap-2 font-bold uppercase tracking-wider"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" /> Copied Link
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy Share Link
                  </>
                )}
              </Button>

              <div className="pt-4 border-t border-border mt-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Pro Tip</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Snapshots are perfect for sharing on Slack, Twitter, or in your next slide deck.
                </p>
              </div>
            </div>

            <Button 
              variant="ghost" 
              onClick={onClose}
              className="mt-auto rounded-none text-muted-foreground hover:text-foreground"
            >
              Close Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
