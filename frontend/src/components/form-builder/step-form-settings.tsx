import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { hasFileUpload, useFormBuilderStore } from "@/store/use-form-builder-store";
import { formsApi } from "@/api/forms.api";
import { formatDatetime, toLocalDatetimeInput, toastApiError } from "@/lib/utils";
import { toast } from "sonner";
import { ImagePlus, Loader2, X, Lock, Timer, Trophy, Radio, User, Infinity as NoLimit } from "lucide-react";
import { Link } from "react-router-dom";
import { useCanUse } from "@/hooks/use-plan";
import { FormBrandingCard } from "./form-branding-card";
import type { FormSettings, QuizTimerMode } from "@/types";

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const DURATION_PRESETS = [10, 15, 30, 60];
const DEFAULT_MINUTES = 30;

const TIMER_MODES: { mode: QuizTimerMode; label: string; hint: string; icon: React.ElementType }[] = [
  { mode: "none", label: "No time limit", hint: "Answer at their own pace. Optionally close at a set time.", icon: NoLimit },
  { mode: "per_person", label: "Per-person limit", hint: "Each person's timer starts when they press Start.", icon: User },
  { mode: "live", label: "Live, you start it", hint: "You press Start and everyone's timer runs together.", icon: Radio },
];

const RESULT_RELEASE = [
  { auto: false, label: "I'll publish manually", hint: "Publish from the quiz's Leaderboard tab whenever you're ready." },
  { auto: true, label: "When the quiz ends", hint: "The leaderboard goes live the moment the quiz closes." },
];

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

  const timer = form.quizTimer;
  const setTimer = (patch: Partial<typeof timer>) => {
    const next = { ...timer, ...patch };
    // A live quiz's end time comes from pressing Start, so a set close time no longer applies.
    updateMeta(next.mode === "live" ? { quizTimer: next, expiresAt: "" } : { quizTimer: next });
  };
  // Auto-publish needs a moment the quiz ends: the live timer, or a close time.
  const canAutoPublish = timer.mode === "live" || !!form.expiresAt;

  const handleNext = async () => {
    if (form.title.trim().length < 1) {
      toast.error("Give your form a title.");
      return;
    }
    if (form.isQuiz && timer.mode !== "none") {
      const m = timer.durationMinutes ?? 0;
      if (!Number.isInteger(m) || m < 1 || m > 600) {
        toast.error("Set the quiz time to a whole number of minutes between 1 and 600.");
        return;
      }
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

      {/* Quiz timer (quizzes) / expiry (other forms) */}
      {form.isQuiz ? (
        <div className="space-y-4 border border-border bg-muted/30 p-4">
          <div className="space-y-0.5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Timer className="h-4 w-4 text-primary" /> Quiz timer
            </p>
            <p className="text-xs text-muted-foreground">
              Everyone sees a live countdown. At zero, the answers so far are submitted automatically.
            </p>
          </div>

          <div role="radiogroup" aria-label="Quiz timer" className="grid gap-2 sm:grid-cols-3">
            {TIMER_MODES.map(({ mode, label, hint, icon: Icon }) => {
              const selected = timer.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTimer({ mode, durationMinutes: timer.durationMinutes ?? DEFAULT_MINUTES })}
                  className={`flex flex-col gap-1 border p-3 text-left transition-colors ${
                    selected ? "border-primary bg-primary/10" : "border-border bg-background hover:border-foreground/30"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </button>
              );
            })}
          </div>

          {timer.mode !== "none" && (
            <div className="space-y-1.5">
              <Label htmlFor="quiz-minutes">{timer.mode === "live" ? "Quiz length" : "Time per person"}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="quiz-minutes"
                  type="number"
                  min={1}
                  max={600}
                  value={timer.durationMinutes ?? ""}
                  onChange={(e) => setTimer({ durationMinutes: e.target.value === "" ? undefined : Math.floor(Number(e.target.value)) })}
                  className="h-9 w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
                {DURATION_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTimer({ durationMinutes: m })}
                    className={`border px-2.5 py-1 text-xs transition-colors hover:border-primary hover:text-primary ${
                      timer.durationMinutes === m ? "border-primary text-primary" : "border-border bg-background"
                    }`}
                  >
                    {m < 60 ? `${m} min` : "1 hour"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {timer.mode === "live" ? (
            <p className="border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">
              After you create the quiz, open it from your dashboard and press <strong className="text-foreground">Start quiz for everyone</strong>.
              People who open the link before that wait in a lobby. Anyone who joins late gets the time that's left, and nobody can take it
              once it ends.
            </p>
          ) : (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="expiry-toggle">Close the quiz at a set time</Label>
                  <p className="text-xs text-muted-foreground">
                    {timer.mode === "per_person"
                      ? "Nobody can start after this, and anyone still answering is stopped then."
                      : "After this, nobody can take the quiz."}
                  </p>
                </div>
                <Switch id="expiry-toggle" checked={!!form.expiresAt} onCheckedChange={(v) => updateMeta({ expiresAt: v ? minDatetime : "" })} />
              </div>
              {!!form.expiresAt && (
                <>
                  <Input
                    type="datetime-local"
                    min={minDatetime}
                    value={form.expiresAt}
                    aria-label="Quiz close time"
                    onChange={(e) => updateMeta({ expiresAt: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Closes <span className="font-medium text-foreground">{formatDatetime(form.expiresAt)}</span>.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="expiry-toggle">Set expiry date & time</Label>
              <p className="text-xs text-muted-foreground">Automatically close the form at a specific time.</p>
            </div>
            <Switch id="expiry-toggle" checked={!!form.expiresAt} onCheckedChange={(v) => updateMeta({ expiresAt: v ? minDatetime : "" })} />
          </div>
          {!!form.expiresAt && (
            <Input
              type="datetime-local"
              min={minDatetime}
              value={form.expiresAt}
              aria-label="Expiry date and time"
              onChange={(e) => updateMeta({ expiresAt: e.target.value })}
            />
          )}
        </div>
      )}

      {/* Quiz results release */}
      {form.isQuiz && (
        <div className="space-y-4 border border-border p-4">
          <div className="space-y-0.5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="h-4 w-4 text-amber-500" /> Results & leaderboard
            </p>
            <p className="text-xs text-muted-foreground">
              Once published, the quiz link shows the leaderboard, each person's rank and the correct answers.
            </p>
          </div>
          <div role="radiogroup" aria-label="Publish results" className="grid gap-3 sm:grid-cols-2">
            {RESULT_RELEASE.map((opt) => {
              const selected = opt.auto === (form.settings.autoPublishResults && canAutoPublish);
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={opt.auto && !canAutoPublish}
                  onClick={() => updateSettings({ autoPublishResults: opt.auto })}
                  className={`border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.hint}</p>
                </button>
              );
            })}
          </div>
          {!canAutoPublish && (
            <p className="text-xs text-muted-foreground">Use a live timer or set a close time to publish automatically.</p>
          )}
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <div className="space-y-0.5">
              <Label htmlFor="releaseScore" className="cursor-pointer text-sm font-normal">
                Show score right after submitting
              </Label>
              <p className="text-xs text-muted-foreground">Respondents see their own score immediately. Correct answers stay hidden until you publish.</p>
            </div>
            <Switch
              id="releaseScore"
              checked={form.settings.releaseScoreImmediately}
              onCheckedChange={(v) => updateSettings({ releaseScoreImmediately: v })}
            />
          </div>
        </div>
      )}

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
