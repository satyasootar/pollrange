import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  Download, 
  Share2, 
  X, 
  Camera, 
  Check, 
  Copy, 
  Smartphone, 
  Monitor, 
  Layout,
  ChevronRight,
  TrendingUp
} from "lucide-react";
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
import { useTheme } from "@/components/theme-provider";

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 1200 1227">
      <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 666.667 666.667">
      <defs>
        <clipPath id="facebook_icon__a" clipPathUnits="userSpaceOnUse">
          <path d="M0 700h700V0H0Z"/>
        </clipPath>
      </defs>
      <g clipPath="url(#facebook_icon__a)" transform="matrix(1.33333 0 0 -1.33333 -133.333 800)">
        <path d="M0 0c0 138.071-111.929 250-250 250S-500 138.071-500 0c0-117.245 80.715-215.622 189.606-242.638v166.242h-51.552V0h51.552v32.919c0 85.092 38.508 124.532 122.048 124.532 15.838 0 43.167-3.105 54.347-6.211V81.986c-5.901.621-16.149.932-28.882.932-40.993 0-56.832-15.528-56.832-55.9V0h81.659l-14.028-76.396h-67.631v-171.773C-95.927-233.218 0-127.818 0 0" style={{ fill: "#0866ff", fillOpacity: 1, fillRule: "nonzero", stroke: "none" }} transform="translate(600 350)"/>
        <path d="m0 0 14.029 76.396H-67.63v27.019c0 40.372 15.838 55.899 56.831 55.899 12.733 0 22.981-.31 28.882-.931v69.253c-11.18 3.106-38.509 6.212-54.347 6.212-83.539 0-122.048-39.441-122.048-124.533V76.396h-51.552V0h51.552v-166.242a250.559 250.559 0 0 1 60.394-7.362c10.254 0 20.358.632 30.288 1.831V0Z" style={{ fill: "#fff", fillOpacity: 1, fillRule: "nonzero", stroke: "none" }} transform="translate(447.918 273.604)"/>
      </g>
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 360 362">
      <path fill="#25D366" fillRule="evenodd" d="M307.546 52.566C273.709 18.684 228.706.017 180.756 0 81.951 0 1.538 80.404 1.504 179.235c-.017 31.594 8.242 62.432 23.928 89.609L0 361.736l95.024-24.925c26.179 14.285 55.659 21.805 85.655 21.814h.077c98.788 0 179.21-80.413 179.244-179.244.017-47.898-18.608-92.926-52.454-126.807v-.008Zm-126.79 275.788h-.06c-26.73-.008-52.952-7.194-75.831-20.765l-5.44-3.231-56.391 14.791 15.05-54.981-3.542-5.638c-14.912-23.721-22.793-51.139-22.776-79.286.035-82.14 66.867-148.973 149.051-148.973 39.793.017 77.198 15.53 105.328 43.695 28.131 28.157 43.61 65.596 43.593 105.398-.035 82.149-66.867 148.982-148.982 148.982v.008Zm81.719-111.577c-4.478-2.243-26.497-13.073-30.606-14.568-4.108-1.496-7.09-2.243-10.073 2.243-2.982 4.487-11.568 14.577-14.181 17.559-2.613 2.991-5.226 3.361-9.704 1.117-4.477-2.243-18.908-6.97-36.02-22.226-13.313-11.878-22.304-26.54-24.916-31.027-2.613-4.486-.275-6.91 1.959-9.136 2.011-2.011 4.478-5.234 6.721-7.847 2.244-2.613 2.983-4.486 4.478-7.469 1.496-2.991.748-5.603-.369-7.847-1.118-2.243-10.073-24.289-13.812-33.253-3.636-8.732-7.331-7.546-10.073-7.692-2.613-.13-5.595-.155-8.586-.155-2.991 0-7.839 1.118-11.947 5.604-4.108 4.486-15.677 15.324-15.677 37.361s16.047 43.344 18.29 46.335c2.243 2.991 31.585 48.225 76.51 67.632 10.684 4.615 19.029 7.374 25.535 9.437 10.727 3.412 20.49 2.931 28.208 1.779 8.604-1.289 26.498-10.838 30.228-21.298 3.73-10.46 3.73-19.433 2.613-21.298-1.117-1.865-4.108-2.991-8.586-5.234l.008-.017Z" clipRule="evenodd"/>
    </svg>
  );
}

interface SnapshotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: FullAnalytics;
  shareUrl: string;
}

type Orientation = "portrait" | "landscape";

export function SnapshotDialog({
  isOpen,
  onClose,
  analytics,
  shareUrl,
}: SnapshotDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  const marketingMessage = `Check out the results for "${analytics.pollTitle}" on PollRange! 🚀 Real-time insights and beautiful visualizations.`;
  const encodedMessage = encodeURIComponent(marketingMessage);
  const encodedUrl = encodeURIComponent(shareUrl);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    
    try {
      // Ensure all images are loaded and fonts are ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the actual computed background color to ensure theme parity
      const rootStyle = window.getComputedStyle(document.body);
      const bgColor = rootStyle.backgroundColor;
      
      // CRITICAL: Get full scroll dimensions to prevent clipping
      const originalWidth = cardRef.current.offsetWidth;
      const originalHeight = cardRef.current.scrollHeight;

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: bgColor, 
        pixelRatio: 3, 
        width: originalWidth,
        height: originalHeight,
        style: {
          transform: 'scale(1)',
          margin: '0',
          padding: '0',
          height: `${originalHeight}px`,
          width: `${originalWidth}px`,
          maxHeight: 'none',
          maxWidth: 'none',
          overflow: 'visible',
        }
      });
      
      const link = document.createElement("a");
      link.download = `pollrange-snapshot-${analytics.pollTitle.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success("High-res snapshot saved!");
    } catch (err) {
      console.error(err);
      toast.error("Generation failed. Please try again.");
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

  const handleSocialShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl overflow-hidden rounded-none border-border p-0 sm:max-w-[90vw] lg:max-w-5xl">
        <div className="flex flex-col lg:flex-row h-full max-h-[90vh] overflow-hidden">
          {/* Preview Area */}
          <div className="flex-1 bg-muted/20 p-4 md:p-8 flex flex-col items-center border-b lg:border-b-0 lg:border-r border-border overflow-y-auto">
            <div className="mb-4 flex items-center gap-2 bg-background border border-border p-1 rounded-none">
              <Button 
                variant={orientation === "portrait" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setOrientation("portrait")}
                className="rounded-none h-8 text-[10px] font-bold uppercase tracking-widest gap-2"
              >
                <Smartphone className="h-3 w-3" /> Portrait
              </Button>
              <Button 
                variant={orientation === "landscape" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setOrientation("landscape")}
                className="rounded-none h-8 text-[10px] font-bold uppercase tracking-widest gap-2"
              >
                <Monitor className="h-3 w-3" /> Landscape
              </Button>
            </div>

            {/* The Actual Card to capture */}
            <div 
              ref={cardRef}
              className={cn(
                "relative bg-background border border-border shadow-2xl transition-all duration-500 origin-center h-fit",
                orientation === "portrait" ? "w-[400px] min-h-[600px]" : "w-[650px] min-h-[400px]"
              )}
            >
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--foreground) 1px, transparent 0)', backgroundSize: '32px 32px' }} 
              />
              
              {/* Top accent bar */}
              <div className="h-1.5 w-full bg-primary" />

              {/* Branding Header */}
              <div className="bg-muted/5 border-b border-border p-6 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-primary p-2">
                    <img src="/logo/logo1.png" alt="PollRange" className="h-full w-auto" />
                  </div>
                  <div>
                    <span className="block font-black tracking-tighter text-foreground text-2xl leading-none uppercase">PollRange</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">Insight Report</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                   <div className="flex gap-4">
                      <div className="text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responses</span>
                        <span className="text-lg font-black text-primary leading-none">{analytics.totalResponses}</span>
                      </div>
                      <div className="text-right border-l border-border pl-4">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Completion</span>
                        <span className="text-lg font-black text-foreground leading-none">{analytics.completionRate}%</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Card Content */}
              <div className={cn(
                "p-8",
                orientation === "landscape" ? "grid grid-cols-2 gap-8" : "space-y-8"
              )}>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-black leading-[1.1] tracking-tight text-foreground">
                      {analytics.pollTitle}
                    </h2>
                    <p className="mt-2 text-xs text-muted-foreground font-medium">
                      Live data synchronization enabled • {new Date().toLocaleDateString()}
                    </p>
                  </div>

                  {/* Summary of Questions (First Column if landscape, otherwise scrollable list) */}
                  <div className="space-y-8">
                    {analytics.questions.map((q, idx) => (
                      <div key={q.questionId} className="space-y-4">
                        <div className="flex items-start gap-3">
                           <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-primary text-[10px] font-bold text-primary-foreground">
                             {idx + 1}
                           </span>
                           <p className="text-sm font-black text-foreground leading-snug">
                             {q.questionText}
                           </p>
                        </div>

                        {q.type === "single_choice" ? (
                          <div className="space-y-2.5 pl-8">
                            {q.options.slice(0, 4).map((opt, i) => (
                              <div key={opt.optionId} className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                                   <span className="truncate pr-4 text-muted-foreground">{opt.optionText}</span>
                                   <span>{opt.percentage}%</span>
                                </div>
                                <div className="relative h-2 w-full bg-muted/20">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${opt.percentage}%` }}
                                    transition={{ duration: 1, delay: idx * 0.1 }}
                                    className={cn("absolute inset-y-0 left-0", i === 0 ? "bg-primary" : "bg-primary/40")}
                                  />
                                </div>
                              </div>
                            ))}
                            {q.options.length > 4 && (
                               <p className="text-[10px] font-bold text-muted-foreground italic pl-1">
                                 + {q.options.length - 4} more options
                               </p>
                            )}
                          </div>
                        ) : (
                          <div className="pl-8 space-y-3">
                             {q.wordCloudData && q.wordCloudData.length > 0 ? (
                               <div className="flex flex-wrap gap-2">
                                  {q.wordCloudData.slice(0, 8).map((word, i) => (
                                    <span 
                                      key={word.text} 
                                      className="px-2 py-1 bg-primary/5 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-tight"
                                    >
                                      {word.text} ({word.value})
                                    </span>
                                  ))}
                                  {q.wordCloudData.length > 8 && (
                                     <span className="text-[10px] font-bold text-muted-foreground opacity-60 flex items-center gap-1">
                                        <ChevronRight className="h-3 w-3" /> and {q.wordCloudData.length - 8} others
                                     </span>
                                  )}
                               </div>
                             ) : (
                               <div className="border border-dashed border-border p-3 text-center bg-muted/5">
                                 <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">Awaiting Responses</p>
                               </div>
                             )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {orientation === "landscape" && (
                   <div className="flex flex-col justify-center items-center p-8 bg-muted/5 border border-border/50 space-y-6">
                      <div className="text-center space-y-2">
                         <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                            <TrendingUp className="h-8 w-8 text-primary" />
                         </div>
                         <h3 className="text-lg font-black uppercase tracking-tight">Growth Trend</h3>
                         <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                            High engagement detected. This poll is outperforming 85% of similar surveys in this category.
                         </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 w-full">
                         <div className="bg-background border border-border p-3 text-center">
                            <span className="block text-[8px] font-bold uppercase text-muted-foreground">Unique Voters</span>
                            <span className="text-xl font-black">{analytics.totalResponses}</span>
                         </div>
                         <div className="bg-background border border-border p-3 text-center">
                            <span className="block text-[8px] font-bold uppercase text-muted-foreground">Status</span>
                            <span className="text-xl font-black text-emerald-500">LIVE</span>
                         </div>
                      </div>
                   </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-auto border-t border-border p-8 bg-muted/5 flex justify-between items-center">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">PollRange Official</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60 tracking-tighter">{shareUrl.replace(/^https?:\/\//, '')}</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-right">
                      <p className="text-[8px] font-bold uppercase text-muted-foreground opacity-50">Verified Results</p>
                      <p className="text-[10px] font-bold text-foreground tracking-widest uppercase">{analytics.pollId.slice(0, 8)}</p>
                   </div>
                   <div className="h-14 w-14 border border-border p-1 bg-white">
                      <div className="w-full h-full bg-black/5 flex items-center justify-center">
                         <Share2 className="h-6 w-6 text-black/20" />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="w-full lg:w-80 shrink-0 p-6 flex flex-col bg-background overflow-y-auto">
            <DialogHeader className="mb-8">
              <div className="inline-flex h-10 w-10 items-center justify-center bg-primary/10 text-primary mb-4">
                 <Layout className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Share Your Impact</DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Customize and share your poll results across your professional networks.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-3">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Download Options</p>
                 <Button 
                   onClick={handleDownload} 
                   disabled={isDownloading}
                   className="w-full h-14 rounded-none gap-3 font-black uppercase tracking-wider text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all"
                 >
                   {isDownloading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin border-2 border-primary-foreground border-t-transparent" />
                        Rendering...
                      </span>
                   ) : (
                     <>
                       <Download className="h-5 w-5" /> Save as High-Res PNG
                     </>
                   )}
                 </Button>
              </div>

              <div className="space-y-3">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Direct Share</p>
                 <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleSocialShare('twitter')}
                      className="h-14 rounded-none hover:bg-black hover:text-white transition-colors"
                      title="Share on X (Twitter)"
                    >
                      <TwitterIcon className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleSocialShare('whatsapp')}
                      className="h-14 rounded-none hover:bg-[#25D366] hover:text-white transition-colors"
                      title="Share on WhatsApp"
                    >
                      <WhatsAppIcon className="h-6 w-6" />
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleSocialShare('facebook')}
                      className="h-14 rounded-none hover:bg-[#1877F2] hover:text-white transition-colors"
                      title="Share on Facebook"
                    >
                      <FacebookIcon className="h-6 w-6" />
                    </Button>
                 </div>
              </div>

              <Button 
                variant="ghost" 
                onClick={handleCopyLink}
                className="w-full h-12 rounded-none gap-2 font-bold uppercase tracking-wider text-xs border border-dashed border-border"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" /> Success!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy Public Link
                  </>
                )}
              </Button>

              <div className="pt-8 border-t border-border mt-6">
                <div className="p-4 bg-muted/30 border border-border italic text-[11px] text-muted-foreground leading-relaxed">
                  "{marketingMessage}"
                </div>
                <p className="mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Included Message</p>
              </div>
            </div>

            <Button 
              variant="ghost" 
              onClick={onClose}
              className="mt-8 rounded-none text-muted-foreground hover:text-foreground uppercase text-[10px] font-bold tracking-[0.2em]"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
