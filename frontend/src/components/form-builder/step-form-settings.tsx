import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { hasFileUpload, useFormBuilderStore } from "@/store/use-form-builder-store";
import { formsApi } from "@/api/forms.api";
import { toLocalDatetimeInput, toastApiError } from "@/lib/utils";
import { toast } from "sonner";
import { ImagePlus, Loader2, X, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useCanUse } from "@/hooks/use-plan";
import { FormBrandingCard } from "./form-branding-card";
import type { FormSettings } from "@/types";

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const SETTING_TOGGLES: { key: keyof FormSettings; label: string; hint: string }[] = [
  { key: "collectEmail", label: "Collect email addresses", hint: "Ask respondents for their email" },
  { key: "limitOneResponse", label: "Limit to one response", hint: "Prevent duplicate submissions" },
  { key: "showProgressBar", label: "Show progress bar", hint: "Display completion progress" },
  { key: "shuffleQuestions", label: "Shuffle question order", hint: "Randomize per respondent" },
];

export function StepFormSettings({ formId }: { formId?: string }) {
  const { form, updateMeta, updateSettings, nextStep } = useFormBuilderStore();
  const [uploading, setUploading] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const canSlug = useCanUse("customSlug");
  const fileUploadLocked = hasFileUpload(form);
  // Lazy state init keeps the impure Date.now() call out of render.
  const [minDatetime] = useState(() => toLocalDatetimeInput(new Date(Date.now() + 5 * 60 * 1000)));

  const checkSlug = async () => {
    const slug = form.slug.trim();
    if (!slug) {
      setSlugStatus("idle");
      return true;
    }
    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(slug)) {
      setSlugStatus("invalid");
      toast.error("Slug must be 3-80 characters using only letters, numbers, hyphens, or underscores.");
      return false;
    }
    setSlugStatus("checking");
    try {
      const result = await formsApi.checkSlug(slug, formId);
      const available = result.data.data.available;
      setSlugStatus(available ? "available" : "taken");
      if (!available) toast.error("That slug is already in use. Choose another one.");
      return available;
    } catch (err) {
      setSlugStatus("idle");
      toastApiError(err);
      return false;
    }
  };

  const handleNext = async () => {
    if (form.title.trim().length < 1) {
      toast.error("Give your form a title.");
      return;
    }
    const { accentColor, redirectUrl } = form.branding;
    if (accentColor && !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      toast.error("Accent colour must be a 6-digit hex like #4f46e5.");
      return;
    }
    if (redirectUrl && !/^https?:\/\/\S+\.\S+/.test(redirectUrl)) {
      toast.error("Redirect link must start with https://");
      return;
    }
    if (!(await checkSlug())) return;
    nextStep();
  };

  const handleCover = async (file: File) => {
    setUploading(true);
    try {
      const res = await formsApi.uploadImage(file);
      updateMeta({ coverImageUrl: res.data.data.url });
      toast.success("Cover image uploaded.");
    } catch (err) {
      toastApiError(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-8 py-8">
      <div>
        <h2 className="text-lg font-semibold">Form Settings</h2>
        <p className="text-sm text-muted-foreground">Configure the basics and behavior of your form.</p>
      </div>

      {/* Cover image */}
      <div className="space-y-2">
        <Label>Cover image (optional)</Label>
        {form.coverImageUrl ? (
          <div className="relative w-full overflow-hidden border border-border">
            <label className="group block cursor-pointer">
              <img src={form.coverImageUrl} alt="Cover" className="max-h-40 w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60 text-sm text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Change cover"}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && handleCover(e.target.files[0])}
              />
            </label>
            <button
              type="button"
              onClick={() => updateMeta({ coverImageUrl: undefined })}
              className="absolute right-2 top-2 border border-border bg-background/90 p-1 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-border py-6 text-sm text-muted-foreground hover:border-primary hover:text-primary">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload cover image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleCover(e.target.files[0])}
            />
          </label>
        )}
        <p className="text-xs text-muted-foreground">Max file size 5MB.</p>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Form title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={form.title}
          placeholder="Untitled form"
          onChange={(e) => updateMeta({ title: e.target.value })}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={form.description}
          placeholder="Add context for your respondents…"
          rows={3}
          onChange={(e) => updateMeta({ description: e.target.value })}
        />
      </div>

      {/* Optional public URL slug */}
      <div className="space-y-1.5">
        <Label htmlFor="slug" className="flex items-center gap-2">
          Custom form slug (optional)
          {!canSlug && (
            <span className="inline-flex items-center gap-1 border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Lock className="h-3 w-3" /> Plus
            </span>
          )}
        </Label>
        <Input
          id="slug"
          value={form.slug}
          placeholder={canSlug ? "Leave blank for a random slug" : "A random link is generated for you"}
          maxLength={80}
          disabled={!canSlug}
          onChange={(e) => {
            updateMeta({ slug: e.target.value });
            setSlugStatus("idle");
          }}
          onBlur={() => void checkSlug()}
          aria-invalid={slugStatus === "taken" || slugStatus === "invalid"}
        />
        <p className={`text-xs ${slugStatus === "taken" || slugStatus === "invalid" ? "text-destructive" : "text-muted-foreground"}`}>
          {slugStatus === "checking" && "Checking availability…"}
          {slugStatus === "available" && "This slug is available."}
          {slugStatus === "taken" && "This slug is already in use."}
          {slugStatus === "invalid" && "Use 3-80 letters, numbers, hyphens, or underscores."}
          {slugStatus === "idle" &&
            (canSlug ? (
              "The public link will use this slug. Leave blank to generate one automatically."
            ) : (
              <>
                Custom links are part of Plus and Pro.{" "}
                <Link to="/dashboard/billing" className="font-medium text-primary underline-offset-2 hover:underline">See plans</Link>
              </>
            ))}
        </p>
      </div>

      {/* Quiz toggle */}
      <div className="flex items-center justify-between border border-border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="isQuiz">Make this a quiz</Label>
          <p className="text-xs text-muted-foreground">Assign points and grade responses automatically.</p>
        </div>
        <Switch id="isQuiz" checked={form.isQuiz} onCheckedChange={(v) => updateMeta({ isQuiz: v })} />
      </div>

      {/* Response mode */}
      <div className="space-y-2">
        <Label>Response mode</Label>
        <div className="grid grid-cols-2 gap-3">
          {(["anonymous", "authenticated"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={mode === "anonymous" && fileUploadLocked}
              onClick={() => updateMeta({ responseMode: mode })}
              className={`border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                form.responseMode === mode ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"
              }`}
            >
              <p className="text-sm font-medium capitalize">{mode}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {mode === "anonymous" ? "Anyone with the link can respond" : "Respondents must be logged in"}
              </p>
            </button>
          ))}
        </div>
        {fileUploadLocked && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> This form has a file upload question, so respondents must sign in to upload files.
          </p>
        )}
      </div>

      {/* Expiry */}
      <div className="space-y-4 border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Set expiry date & time</Label>
            <p className="text-xs text-muted-foreground">Automatically close the form at a specific time.</p>
          </div>
          <Switch
            checked={!!form.expiresAt}
            onCheckedChange={(v) => updateMeta({ expiresAt: v ? minDatetime : "" })}
          />
        </div>
        {!!form.expiresAt && (
          <Input
            type="datetime-local"
            min={minDatetime}
            value={form.expiresAt}
            onChange={(e) => updateMeta({ expiresAt: e.target.value })}
          />
        )}
      </div>

      {/* Settings toggles */}
      <div className="space-y-3 border border-border p-4">
        <p className="text-sm font-medium">Response settings</p>
        {SETTING_TOGGLES.map(({ key, label, hint }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={key} className="cursor-pointer text-sm font-normal">
                {label}
              </Label>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <Switch
              id={key}
              checked={form.settings[key] as boolean}
              onCheckedChange={(v) => updateSettings({ [key]: v })}
            />
          </div>
        ))}
        {form.isQuiz && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="space-y-0.5">
              <Label htmlFor="releaseScore" className="cursor-pointer text-sm font-normal">
                Release score immediately
              </Label>
              <p className="text-xs text-muted-foreground">Show respondents their score right after submitting.</p>
            </div>
            <Switch
              id="releaseScore"
              checked={form.settings.releaseScoreImmediately}
              onCheckedChange={(v) => updateSettings({ releaseScoreImmediately: v })}
            />
          </div>
        )}
      </div>

      {/* Confirmation message */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmation">Confirmation message</Label>
        <Textarea
          id="confirmation"
          value={form.settings.confirmationMessage}
          placeholder="Your response has been recorded."
          rows={2}
          onChange={(e) => updateSettings({ confirmationMessage: e.target.value })}
        />
      </div>

      <FormBrandingCard />

      <div className="flex justify-end">
        <Button onClick={handleNext}>Continue to Questions →</Button>
      </div>
    </div>
  );
}
