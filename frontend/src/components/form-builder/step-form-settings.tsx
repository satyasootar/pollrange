import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { formsApi } from "@/api/forms.api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { FormSettings } from "@/types";

const SETTING_TOGGLES: { key: keyof FormSettings; label: string; hint: string }[] = [
  { key: "collectEmail", label: "Collect email addresses", hint: "Ask respondents for their email" },
  { key: "limitOneResponse", label: "Limit to one response", hint: "Prevent duplicate submissions" },
  { key: "showProgressBar", label: "Show progress bar", hint: "Display completion progress" },
  { key: "shuffleQuestions", label: "Shuffle question order", hint: "Randomize per respondent" },
];

export function StepFormSettings() {
  const { form, updateMeta, updateSettings, nextStep } = useFormBuilderStore();
  const [uploading, setUploading] = useState(false);
  // Lazy state init keeps the impure Date.now() call out of render.
  const [minDatetime] = useState(() => new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16));

  const handleNext = () => {
    if (form.title.trim().length < 1) {
      toast.error("Give your form a title.");
      return;
    }
    nextStep();
  };

  const handleCover = async (file: File) => {
    setUploading(true);
    try {
      const res = await formsApi.uploadImage(file);
      updateMeta({ coverImageUrl: res.data.data.url });
      toast.success("Cover image uploaded.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
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
              onClick={() => updateMeta({ responseMode: mode })}
              className={`border p-4 text-left transition-colors ${
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

      <div className="flex justify-end">
        <Button onClick={handleNext}>Continue to Questions →</Button>
      </div>
    </div>
  );
}
