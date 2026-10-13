import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { 
  Download,
  Printer,
  Copy,
  Check,
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { buildShareUrl } from "@/lib/utils";
import { QR_CIRCLE_LOGO } from "@/lib/brand";
import type { UserBranding } from "@/types";

interface QRCardDialogProps {
  pollId: string;
  shareToken: string;
  pollTitle: string;
  defaultBranding?: UserBranding;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QRCardDialog({ pollId, shareToken, pollTitle, defaultBranding, trigger, open, onOpenChange }: QRCardDialogProps) {
  const [branding, setBranding] = useState({
    companyName: defaultBranding?.companyName || "",
    businessDetails: defaultBranding?.businessDetails || "",
    qrColor: defaultBranding?.qrColor || "#000000",
  });
  // Brand kit logo in the QR centre when enabled; otherwise the Kollects mark.
  const qrLogo = defaultBranding?.qrLogo && defaultBranding.logoUrl ? defaultBranding.logoUrl : "/logo/logo1.png";
  const accent = defaultBranding?.accentColor || "#000000";

  const [cardStyles, setCardStyles] = useState({
    backgroundColor: "#ffffff",
    textColor: "#000000",
    alignment: "center" as "left" | "center" | "right",
    fontSize: "medium" as "small" | "medium" | "large",
    qrSize: 160,
  });

  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const pollUrl = buildShareUrl(shareToken);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, quality: 1, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `poll-qr-${pollId}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("QR Card downloaded!");
    } catch {
      toast.error("Failed to generate image");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pollUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  const getFontSize = (element: "company" | "title" | "details") => {
    const scales = {
      small: { company: "text-sm", title: "text-base", details: "text-[9px]" },
      medium: { company: "text-lg", title: "text-xl", details: "text-[11px]" },
      large: { company: "text-2xl", title: "text-3xl", details: "text-sm" },
    };
    return scales[cardStyles.fontSize][element];
  };

  const alignmentClass = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
  }[cardStyles.alignment];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <QRCodeSVG value={pollUrl} size={16} />
            Generate QR Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl w-full h-[95vh] lg:h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-background">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Sidebar: Controls */}
          <div className="w-full lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card flex flex-col max-h-[40vh] lg:max-h-full">
            <div className="p-5 border-b border-border">
              <DialogTitle className="text-xl font-bold tracking-tight">Design QR Card</DialogTitle>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">Customize your marketing asset</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-9">
                  <TabsTrigger value="content" className="gap-2 text-xs">
                    <Type className="h-3.5 w-3.5" /> Content
                  </TabsTrigger>
                  <TabsTrigger value="style" className="gap-2 text-xs">
                    <Palette className="h-3.5 w-3.5" /> Style
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Company Name</Label>
                      <Input
                        value={branding.companyName}
                        onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                        placeholder="e.g. Acme Corp"
                        className="bg-muted/30 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Card Title</Label>
                      <Input
                        value={pollTitle}
                        disabled
                        className="bg-muted/10 opacity-70 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description / CTA</Label>
                      <Textarea
                        value={branding.businessDetails}
                        onChange={(e) => setBranding({ ...branding, businessDetails: e.target.value })}
                        placeholder="Scan to participate..."
                        rows={3}
                        className="bg-muted/30 resize-none text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Alignment</Label>
                      <div className="flex gap-1 p-1 bg-muted/30 border border-border rounded-md">
                        {(["left", "center", "right"] as const).map((align) => (
                          <Button
                            key={align}
                            variant={cardStyles.alignment === align ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1 h-7"
                            onClick={() => setCardStyles({ ...cardStyles, alignment: align })}
                          >
                            {align === "left" && <AlignLeft className="h-3.5 w-3.5" />}
                            {align === "center" && <AlignCenter className="h-3.5 w-3.5" />}
                            {align === "right" && <AlignRight className="h-3.5 w-3.5" />}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Text Size</Label>
                      <div className="flex gap-1 p-1 bg-muted/30 border border-border rounded-md">
                        {(["small", "medium", "large"] as const).map((size) => (
                          <Button
                            key={size}
                            variant={cardStyles.fontSize === size ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1 h-7 text-[9px] uppercase font-black tracking-tighter"
                            onClick={() => setCardStyles({ ...cardStyles, fontSize: size })}
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">QR Color</Label>
                        <div className="flex gap-2">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border">
                            <input
                              type="color"
                              value={branding.qrColor}
                              onChange={(e) => setBranding({ ...branding, qrColor: e.target.value })}
                              className="absolute inset-0 h-full w-full cursor-pointer scale-150 bg-transparent"
                            />
                          </div>
                          <Input
                            value={branding.qrColor}
                            onChange={(e) => setBranding({ ...branding, qrColor: e.target.value })}
                            className="h-9 text-[10px] font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Card BG</Label>
                        <div className="flex gap-2">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border">
                            <input
                              type="color"
                              value={cardStyles.backgroundColor}
                              onChange={(e) => setCardStyles({ ...cardStyles, backgroundColor: e.target.value })}
                              className="absolute inset-0 h-full w-full cursor-pointer scale-150 bg-transparent"
                            />
                          </div>
                          <Input
                            value={cardStyles.backgroundColor}
                            onChange={(e) => setCardStyles({ ...cardStyles, backgroundColor: e.target.value })}
                            className="h-9 text-[10px] font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">QR Size</Label>
                        <span className="text-[9px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded">{cardStyles.qrSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="240"
                        value={cardStyles.qrSize}
                        onChange={(e) => setCardStyles({ ...cardStyles, qrSize: parseInt(e.target.value) })}
                        className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="p-5 border-t border-border bg-muted/10 space-y-3">
              <Button onClick={handleDownload} className="w-full gap-2 h-11 font-bold uppercase tracking-tight">
                <Download className="h-4 w-4" /> Download PNG
              </Button>
              <div className="flex gap-2">
                <Button onClick={handleCopy} variant="outline" className="flex-1 gap-2 h-10 text-[10px] font-bold uppercase tracking-tight">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy URL"}
                </Button>
                <Button variant="outline" size="icon" onClick={() => window.print()} className="h-10 w-10">
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content: Large Preview */}
          <div className="flex-1 bg-[#0a0a0a] relative overflow-hidden flex flex-col items-center justify-center p-6 md:p-12">
            {/* Visual indicators */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-white/20 pointer-events-none">
              <Maximize2 className="h-3 w-3" /> Digital Marketing Asset Preview
            </div>

            {/* Card Container with scaling logic */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
               {/* Fixed size card that we scale down via CSS */}
               <div className="scale-[0.5] sm:scale-[0.6] md:scale-[0.8] lg:scale-[0.9] xl:scale-100 origin-center transition-transform duration-500">
                  <div 
                    ref={cardRef}
                    className={`w-[450px] aspect-[1/1.4] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.8)] flex flex-col p-12 border-[20px] border-black`}
                    style={{ 
                      backgroundColor: cardStyles.backgroundColor,
                      color: cardStyles.textColor,
                      textAlign: cardStyles.alignment as "left" | "center" | "right"
                    }}
                  >
                    {/* Header Section */}
                    <div className={`w-full flex flex-col ${alignmentClass}`}>
                      {defaultBranding?.logoUrl && (
                        <img src={defaultBranding.logoUrl} alt="" crossOrigin="anonymous" className="mb-3 max-h-12 w-auto object-contain" />
                      )}
                      <span className={`font-black tracking-tighter uppercase leading-none mb-3 ${getFontSize("company")}`}>
                        {branding.companyName || "Your Brand"}
                      </span>
                      <div className="h-2.5 w-20" style={{ backgroundColor: accent }} />
                    </div>

                    {/* QR Section */}
                    <div className="flex-1 flex items-center justify-center">
                      <div className="p-5 bg-white border-[8px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all duration-300">
                        <QRCodeSVG 
                          value={pollUrl} 
                          size={cardStyles.qrSize} 
                          fgColor={branding.qrColor} 
                          level="H"
                          includeMargin={false}
                          className={defaultBranding?.qrLogo && defaultBranding.logoUrl && defaultBranding.qrLogoShape === "circle" ? QR_CIRCLE_LOGO : undefined}
                          imageSettings={{
                            src: qrLogo,
                            crossOrigin: "anonymous",
                            x: undefined,
                            y: undefined,
                            height: cardStyles.qrSize * 0.25,
                            width: cardStyles.qrSize * 0.25,
                            excavate: true,
                          }}
                        />
                      </div>
                    </div>

                    {/* Footer Section */}
                    <div className={`w-full flex flex-col ${alignmentClass} gap-4`}>
                      <h3 className={`font-black uppercase leading-tight tracking-tighter ${getFontSize("title")}`}>
                        {pollTitle}
                      </h3>
                      <div className="h-[2px] w-full bg-black/10" />
                    </div>
                  </div>
               </div>
            </div>

            {/* Hint */}
            <div className="absolute bottom-6 flex items-center gap-4 text-[9px] text-white/20 font-black uppercase tracking-widest">
              <span>Resolution: 300 DPI</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Format: PNG</span>
            </div>
          </div>
        </div>
      </DialogContent>
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .preview-card-container { visibility: visible; position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </Dialog>
  );
}
