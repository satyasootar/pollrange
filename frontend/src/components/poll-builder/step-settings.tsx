import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePollBuilderStore } from "@/store/use-poll-builder-store";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(1000).optional(),
  expiresAt: z.string().refine(
    (v) => v && new Date(v) > new Date(),
    "Expiry must be in the future"
  ),
  responseMode: z.enum(["anonymous", "authenticated"]),
  settings: z.object({
    showProgressBar: z.boolean(),
    randomizeQuestions: z.boolean(),
    randomizeOptions: z.boolean(),
  }),
});

type FormValues = z.infer<typeof schema>;

export function StepSettings() {
  const { form, updateMeta, nextStep } = usePollBuilderStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: form.title,
      description: form.description,
      expiresAt: form.expiresAt,
      responseMode: form.responseMode,
      settings: form.settings,
    },
  });

  const responseMode = watch("responseMode");
  const settings = watch("settings");

  const onSubmit = (data: FormValues) => {
    updateMeta(data);
    nextStep();
  };

  // Min datetime: now + 5min
  const minDatetime = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-2xl px-8 py-8 space-y-8"
    >
      <div>
        <h2 className="text-lg font-semibold">Poll Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure the basic details and behavior of your poll.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Poll Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="What's your poll about?"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Add more context for your respondents…"
          rows={3}
          {...register("description")}
        />
      </div>

      {/* Expiry */}
      <div className="space-y-1.5">
        <Label htmlFor="expiresAt">
          Expiry Date & Time <span className="text-destructive">*</span>
        </Label>
        <Input
          id="expiresAt"
          type="datetime-local"
          min={minDatetime}
          {...register("expiresAt")}
        />
        {errors.expiresAt && (
          <p className="text-xs text-destructive">{errors.expiresAt.message}</p>
        )}
      </div>

      {/* Response Mode */}
      <div className="space-y-2">
        <Label>Response Mode</Label>
        <div className="grid grid-cols-2 gap-3">
          {(["anonymous", "authenticated"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setValue("responseMode", mode)}
              className={`border p-4 text-left transition-colors ${
                responseMode === mode
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              <p className="text-sm font-medium capitalize">{mode}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === "anonymous"
                  ? "Anyone with the link can respond"
                  : "Respondents must be logged in"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Settings toggles */}
      <div className="space-y-3 border border-border p-4">
        <p className="text-sm font-medium">Display Settings</p>
        {(
          [
            // ["showProgressBar", "Show Progress Bar"],
            ["randomizeQuestions", "Randomize Question Order"],
            ["randomizeOptions", "Randomize Option Order"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={key} className="text-sm font-normal text-muted-foreground cursor-pointer">
              {label}
            </Label>
            <Switch
              id={key}
              checked={settings?.[key] ?? false}
              onCheckedChange={(checked) =>
                setValue(`settings.${key}`, checked)
              }
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit">Continue to Questions →</Button>
      </div>
    </form>
  );
}
