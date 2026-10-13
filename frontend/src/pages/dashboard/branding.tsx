import { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Loader2, Lock, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandScope } from "@/components/brand/brand-scope";
import { BrandFooter, BrandHeader } from "@/components/brand/brand-chrome";
import { ImageField } from "@/components/brand/image-field";
import { useUpdateProfile } from "@/hooks/use-profile";
import { useCanUse } from "@/hooks/use-plan";
import { useAuthStore } from "@/store/use-auth-store";
import { ACCENT_SWATCHES, BRAND_FONTS, BRAND_RADII, HEX_RE, QR_CIRCLE_LOGO, contrastRatio, kitToPublic, withBrandDefaults } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { BrandBackground, UserBranding } from "@/types";

export function BrandingPage() {
  const user = useAuthStore((s) => s.user);
  const canBrand = useCanUse("branding");
  const update = useUpdateProfile();
  const [saved, setSaved] = useState(() => withBrandDefaults(user?.branding));
  const [kit, setKit] = useState(saved);
  const set = (patch: Partial<UserBranding>) => setKit((k) => ({ ...k, ...patch }));

  const dirty = JSON.stringify(kit) !== JSON.stringify(saved);
  const accentOk = !kit.accentColor || HEX_RE.test(kit.accentColor);
  const lowContrast = HEX_RE.test(kit.accentColor) && contrastRatio(kit.accentColor, "#ffffff") < 3;

  const save = () =>
    update.mutate({ branding: kit }, { onSuccess: (res) => setSaved(withBrandDefaults(res.data.data.user.branding)) });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-border px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
            <Palette className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">Brand kit</h1>
            <p className="truncate text-sm text-muted-foreground">Set it once. Every form, poll and QR code uses it.</p>
          </div>
        </div>
        {canBrand ? (
          <Button onClick={save} disabled={!dirty || !accentOk || update.isPending} className="shrink-0 gap-2">
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        ) : (
          <Button asChild className="shrink-0 gap-2">
            <Link to="/dashboard/billing">
              <Lock className="h-4 w-4" /> Upgrade to save
            </Link>
          </Button>
        )}
      </div>

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
        {!canBrand && (
          <p className="flex flex-wrap items-center gap-2 border-b border-primary/30 bg-primary/5 px-4 py-2.5 text-xs md:px-8">
            <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
            Branding is part of Plus and Pro. Try it out below, then upgrade to put it on your forms.
          </p>
        )}

        <div className="grid gap-8 px-4 py-6 md:px-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:grid-rows-[minmax(0,1fr)] lg:py-0">
          {/* Preview first on mobile; on desktop only the settings column scrolls, so the preview stays put */}
          <aside className="lg:order-2 lg:py-6">
            <div>
              <Preview kit={kit} />
            </div>
          </aside>

          <div className="custom-scrollbar space-y-8 lg:order-1 lg:-mr-4 lg:overflow-y-auto lg:py-6 lg:pr-4">
            <Section title="Identity" hint="Shown at the top of your forms and on thank-you screens.">
              <ImageField label="Logo" value={kit.logoUrl} onChange={(logoUrl) => set({ logoUrl })} hint="PNG or SVG with a transparent background works best." />
              <Field id="companyName" label="Company name">
                <Input id="companyName" value={kit.companyName} maxLength={80} placeholder="Acme Studio" onChange={(e) => set({ companyName: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="website" label="Website">
                  <Input id="website" type="url" value={kit.website} placeholder="https://acme.com" onChange={(e) => set({ website: e.target.value })} />
                </Field>
                <Field id="supportEmail" label="Contact email">
                  <Input id="supportEmail" type="email" value={kit.supportEmail} placeholder="hello@acme.com" onChange={(e) => set({ supportEmail: e.target.value })} />
                </Field>
              </div>
            </Section>

            <Section title="Look" hint="Buttons, highlights and progress bars use your accent colour.">
              <Field id="accent" label="Accent colour">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => set({ accentColor: "" })}
                    className={cn("h-8 border px-2 text-xs", !kit.accentColor ? "border-foreground" : "border-border text-muted-foreground")}
                  >
                    Default
                  </button>
                  {ACCENT_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Accent ${c}`}
                      aria-pressed={kit.accentColor === c}
                      onClick={() => set({ accentColor: c })}
                      className={cn("h-8 w-8 border-2", kit.accentColor === c ? "border-foreground" : "border-transparent")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label="Custom accent colour"
                    value={HEX_RE.test(kit.accentColor) ? kit.accentColor : "#4f46e5"}
                    onChange={(e) => set({ accentColor: e.target.value })}
                    className="h-8 w-10 cursor-pointer border border-border bg-transparent"
                  />
                  <Input
                    id="accent"
                    value={kit.accentColor}
                    placeholder="#4f46e5"
                    maxLength={7}
                    aria-invalid={!accentOk}
                    onChange={(e) => set({ accentColor: e.target.value.trim() })}
                    className="h-8 w-28"
                  />
                </div>
                {!accentOk && <p className="text-xs text-destructive">Use a 6-digit hex colour like #4f46e5.</p>}
                {lowContrast && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Light colours can be hard to read on white. Consider a darker shade.
                  </p>
                )}
              </Field>

              <Field id="font" label="Font">
                <select
                  id="font"
                  value={kit.font}
                  onChange={(e) => set({ font: e.target.value as UserBranding["font"] })}
                  className="h-12 w-full border-2 border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
                >
                  {BRAND_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="radius" label="Corners">
                  <Segmented
                    value={kit.radius}
                    options={BRAND_RADII.map((r) => ({ id: r.id, label: r.label }))}
                    onChange={(radius) => set({ radius })}
                  />
                </Field>
                <Field id="background" label="Background">
                  <Segmented<BrandBackground>
                    value={kit.background}
                    options={[
                      { id: "plain", label: "Plain" },
                      { id: "tint", label: "Tinted" },
                    ]}
                    onChange={(background) => set({ background })}
                  />
                </Field>
              </div>
            </Section>

            <Section title="QR codes" hint="Used by the QR card you can download for posters and flyers.">
              <div className="flex flex-wrap items-center gap-6">
                <Field id="qrColor" label="QR colour">
                  <div className="flex items-center gap-2">
                    <input id="qrColor" type="color" value={kit.qrColor} onChange={(e) => set({ qrColor: e.target.value })} className="h-9 w-10 cursor-pointer border border-border bg-transparent" />
                    <span className="font-mono text-xs text-muted-foreground">{kit.qrColor}</span>
                  </div>
                </Field>
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={kit.qrLogo} disabled={!kit.logoUrl} onCheckedChange={(qrLogo) => set({ qrLogo })} />
                  Logo in the centre{!kit.logoUrl && <span className="text-xs text-muted-foreground">(add a logo first)</span>}
                </label>
                {kit.qrLogo && kit.logoUrl && (
                  <Field id="qrLogoShape" label="Logo shape">
                    <Segmented<UserBranding["qrLogoShape"]>
                      value={kit.qrLogoShape}
                      options={[
                        { id: "square", label: "Square" },
                        { id: "circle", label: "Circle" },
                      ]}
                      onChange={(qrLogoShape) => set({ qrLogoShape })}
                    />
                  </Field>
                )}
              </div>
            </Section>

            <Section title="Link previews" hint="The image shown when your form link is shared on WhatsApp, LinkedIn, Slack…">
              <ImageField label="Share image" value={kit.shareImageUrl} onChange={(shareImageUrl) => set({ shareImageUrl })} hint="1200×630 recommended. Falls back to your logo." />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border border-border bg-card p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" className="grid grid-flow-col auto-cols-fr border border-border">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("h-9 px-4 text-xs font-medium transition-colors", value === o.id ? "bg-foreground text-background" : "hover:bg-muted")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Preview({ kit }: { kit: UserBranding }) {
  const brand = kitToPublic(kit);
  const shareImage = kit.shareImageUrl || kit.logoUrl;
  return (
    <Tabs defaultValue="form">
      <TabsList className="mb-3 grid w-full grid-cols-3">
        <TabsTrigger value="form">Form</TabsTrigger>
        <TabsTrigger value="qr">QR code</TabsTrigger>
        <TabsTrigger value="link">Link preview</TabsTrigger>
      </TabsList>

      <TabsContent value="form">
        <BrandScope brand={brand} className="border border-border bg-background p-5">
          <BrandHeader brand={brand} className="mb-4" />
          <p className="text-lg font-bold leading-tight">Customer feedback</p>
          <p className="mt-1 text-xs text-muted-foreground">Tell us how we did. It takes a minute.</p>
          <div className="mt-3 h-1 w-full bg-border">
            <div className="h-full w-1/3 bg-primary" />
          </div>
          <div className="mt-4 border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">How was your visit?</p>
            <div className="space-y-2">
              {["Loved it", "It was okay"].map((t, i) => (
                <div key={t} className={cn("flex items-center gap-3 border p-2.5 text-sm", i === 0 ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                  <span className={cn("h-3.5 w-3.5 rounded-full border-2", i === 0 ? "border-primary bg-primary" : "border-muted-foreground/40")} />
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" tabIndex={-1}>Submit</Button>
          </div>
          <BrandFooter brand={brand} />
        </BrandScope>
      </TabsContent>

      <TabsContent value="qr">
        <div className="flex flex-col items-center gap-3 border border-border bg-white p-6 text-black">
          {kit.companyName && <p className="text-sm font-black uppercase tracking-tight">{kit.companyName}</p>}
          <QRCodeSVG
            value="https://kollects.app/f/sample"
            size={180}
            fgColor={kit.qrColor}
            level="H"
            className={kit.qrLogoShape === "circle" ? QR_CIRCLE_LOGO : undefined}
            {...(kit.qrLogo && kit.logoUrl ? { imageSettings: { src: kit.logoUrl, height: 44, width: 44, excavate: true } } : {})}
          />
          <p className="text-xs text-black/60">Scan to respond</p>
        </div>
      </TabsContent>

      <TabsContent value="link">
        <div className="overflow-hidden border border-border bg-card">
          {shareImage ? (
            <div className="flex aspect-[1200/630] items-center justify-center bg-muted">
              <img src={shareImage} alt="" className={kit.shareImageUrl ? "h-full w-full object-cover" : "max-h-24 object-contain"} />
            </div>
          ) : (
            <div className="flex aspect-[1200/630] items-center justify-center bg-muted text-xs text-muted-foreground">Kollects default image</div>
          )}
          <div className="space-y-0.5 p-3">
            <p className="text-[11px] uppercase text-muted-foreground">{kit.companyName || "Kollects"}</p>
            <p className="text-sm font-semibold">Customer feedback</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">Tell us how we did. It takes a minute.</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Each form can override the title, description and image in its settings.</p>
      </TabsContent>
    </Tabs>
  );
}
