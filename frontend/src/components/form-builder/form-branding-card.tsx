import { Link } from "react-router-dom";
import { Lock, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageField } from "@/components/brand/image-field";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { useAuthStore } from "@/store/use-auth-store";
import { useCanUse } from "@/hooks/use-plan";
import { HEX_RE, withBrandDefaults } from "@/lib/brand";
import type { FormBrandingOverride } from "@/types";

const isHttpUrl = (v: string) => /^https?:\/\/\S+\.\S+/.test(v);

/** Per-form branding: use the account's brand kit or not, plus light overrides. */
export function FormBrandingCard() {
  const { form, updateMeta } = useFormBuilderStore();
  const canBrand = useCanUse("branding");
  const kit = withBrandDefaults(useAuthStore((s) => s.user?.branding));
  const b = form.branding;
  const set = (patch: Partial<FormBrandingOverride>) => updateMeta({ branding: { ...b, ...patch } });
  const hasKit = !!(kit.logoUrl || kit.companyName || kit.accentColor);
  const redirectBad = !!b.redirectUrl && !isHttpUrl(b.redirectUrl);

  return (
    <div className="space-y-4 border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="useKit" className="flex items-center gap-2">
            Branding
            {!canBrand && (
              <span className="inline-flex items-center gap-1 border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                <Lock className="h-3 w-3" /> Plus
              </span>
            )}
          </Label>
          <p className="text-xs text-muted-foreground">Use your brand kit on this form.</p>
        </div>
        <Switch id="useKit" checked={b.useKit} onCheckedChange={(useKit) => set({ useKit })} />
      </div>

      {b.useKit && (
        <>
          <Link to="/dashboard/branding" className="flex items-center gap-3 border border-border bg-muted/30 p-3 text-sm hover:border-primary/40">
            {kit.logoUrl ? (
              <img src={kit.logoUrl} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground">
                <Palette className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">
              {hasKit ? kit.companyName || "Your brand kit" : "No brand kit yet. Set one up"}
            </span>
            {kit.accentColor && <span className="h-5 w-5 shrink-0 border border-border" style={{ backgroundColor: kit.accentColor }} />}
            <span className="text-xs text-primary">Edit →</span>
          </Link>

          {!canBrand && (
            <p className="text-xs text-muted-foreground">
              Branding shows on your form once you're on Plus or Pro.{" "}
              <Link to="/dashboard/billing" className="font-medium text-primary underline-offset-2 hover:underline">See plans</Link>
            </p>
          )}

          <fieldset disabled={!canBrand} className="space-y-4 disabled:opacity-60">
            <div className="space-y-1.5">
              <Label htmlFor="formAccent">Accent colour for this form</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick accent colour"
                  value={HEX_RE.test(b.accentColor ?? "") ? b.accentColor : kit.accentColor || "#4f46e5"}
                  onChange={(e) => set({ accentColor: e.target.value })}
                  className="h-9 w-10 cursor-pointer border border-border bg-transparent"
                />
                <Input
                  id="formAccent"
                  value={b.accentColor ?? ""}
                  placeholder={kit.accentColor ? `Brand kit (${kit.accentColor})` : "Brand kit"}
                  maxLength={7}
                  onChange={(e) => set({ accentColor: e.target.value.trim() })}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="redirectUrl">Redirect after submit (optional)</Label>
              <Input
                id="redirectUrl"
                type="url"
                value={b.redirectUrl ?? ""}
                placeholder="https://yoursite.com/thanks"
                aria-invalid={redirectBad}
                onChange={(e) => set({ redirectUrl: e.target.value.trim() })}
              />
              <p className={`text-xs ${redirectBad ? "text-destructive" : "text-muted-foreground"}`}>
                {redirectBad ? "Enter a full link starting with https://" : "Respondents see the thank-you screen, then go here after 5 seconds."}
              </p>
            </div>

            <details className="group border-t border-border pt-3">
              <summary className="cursor-pointer text-sm font-medium">Link preview</summary>
              <p className="mt-1 text-xs text-muted-foreground">What WhatsApp, LinkedIn and Slack show when this link is shared.</p>
              <div className="mt-3 space-y-3">
                <Input value={b.shareTitle ?? ""} maxLength={120} placeholder={form.title || "Title (defaults to form title)"} aria-label="Share title" onChange={(e) => set({ shareTitle: e.target.value })} />
                <Textarea value={b.shareDescription ?? ""} maxLength={300} rows={2} placeholder="Description (defaults to form description)" aria-label="Share description" onChange={(e) => set({ shareDescription: e.target.value })} />
                <ImageField label="Share image" value={b.shareImageUrl ?? ""} onChange={(shareImageUrl) => set({ shareImageUrl })} hint="1200×630 recommended. Defaults to your brand kit image." />
              </div>
            </details>
          </fieldset>
        </>
      )}
    </div>
  );
}
