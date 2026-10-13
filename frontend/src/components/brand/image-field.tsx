import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { formsApi } from "@/api/forms.api";
import { toastApiError } from "@/lib/utils";

/** Small image picker that uploads to Cloudinary and hands back the URL. */
export function ImageField({ label, value, onChange, hint }: { label: string; value: string; onChange: (url: string) => void; hint: string }) {
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    try {
      const res = await formsApi.uploadImage(file);
      onChange(res.data.data.url);
    } catch (err) {
      toastApiError(err);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <label className="relative flex h-16 w-28 shrink-0 cursor-pointer items-center justify-center border border-dashed border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-primary">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : value ? (
            <img src={value} alt="" className="max-h-14 max-w-24 object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <input type="file" accept="image/*" className="sr-only" aria-label={`Upload ${label.toLowerCase()}`} disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">{hint}</p>
          {value && (
            <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

