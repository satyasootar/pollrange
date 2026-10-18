import { Plus, Trash2, X, Copy, GripVertical, IndianRupee, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { QUESTION_TYPE_META, CHOICE_TYPES, GRID_TYPES, GRADABLE_TYPES } from "./question-types";
import { newObjectId } from "@/lib/utils";
import { DEFAULT_PAYMENT_MESSAGE, PAYMENT_TOKENS, UPI_ID_REGEX, formatInr, renderPaymentMessage } from "@/lib/upi-payment";
import type { BuilderFormQuestion, FormQuestionType, AnswerKey, GridItem, PaymentConfig } from "@/types";

/** Matches the backend's option.amount cap. */
const MAX_AMOUNT = 1_000_000;

/** UPI collection settings for a choice question: toggle, payee UPI ID, note template, selection limits. */
function PaymentSettings({ question: q, onChange }: { question: BuilderFormQuestion; onChange: (payment: PaymentConfig) => void }) {
  const p = q.payment;
  const enabled = p?.enabled ?? false;
  const set = (patch: Partial<PaymentConfig>) =>
    onChange({ enabled, upiId: "", messageTemplate: DEFAULT_PAYMENT_MESSAGE, ...p, ...patch });

  const upiId = p?.upiId.trim() ?? "";
  const upiValid = UPI_ID_REGEX.test(upiId);
  const priced = q.options.filter((o) => (o.amount ?? 0) > 0);
  const sample = priced.slice(0, 2);
  const preview = renderPaymentMessage(
    { messageTemplate: p?.messageTemplate ?? DEFAULT_PAYMENT_MESSAGE },
    {
      form_response_id: "671a2b3c4d5e6f7a8b9c0d1e",
      selected_options: sample.map((o) => o.text || "Option").join(", ") || "Option 1",
      total_amount: sample.reduce((s, o) => s + (o.amount ?? 0), 0),
      number_of_selected_options: sample.length || 1,
      user_name: "Asha",
    }
  ).slice(0, 80);
  const numOrUndef = (v: string) => (v === "" ? undefined : Math.max(0, Math.floor(Number(v))));

  return (
    <div className={`border-t border-border pt-3 ${enabled ? "space-y-4" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border ${enabled ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            <IndianRupee className="h-4 w-4" />
          </span>
          <div>
            <Label htmlFor={`pay-${q.id}`} className="cursor-pointer text-sm">Collect payment via UPI</Label>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? "Set a price on each option. Leave blank for free options."
                : "Charge per option. Respondents scan a QR to pay after submitting."}
            </p>
          </div>
        </div>
        <Switch id={`pay-${q.id}`} checked={enabled} onCheckedChange={(on) => set({ enabled: on })} />
      </div>

      {enabled && (
        <div className="space-y-4 border border-border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label htmlFor={`upi-${q.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pay to (your UPI ID)
            </Label>
            <Input
              id={`upi-${q.id}`}
              value={p?.upiId ?? ""}
              placeholder="yourname@okaxis"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!upiId && !upiValid}
              onChange={(e) => set({ upiId: e.target.value })}
              className="h-9 text-sm"
            />
            {upiId && !upiValid ? (
              <p className="text-xs text-destructive">That doesn't look like a UPI ID. It should look like name@bank.</p>
            ) : upiValid ? (
              <p className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Payments go to {upiId}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Find it in GPay, PhonePe or Paytm under your profile.</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {priced.length === 0 ? (
              <span className="text-amber-600">No option has a price yet. Add one above.</span>
            ) : (
              <>
                {priced.length} of {q.options.length} options priced ·{" "}
                {formatInr(Math.min(...priced.map((o) => o.amount!)))}
                {priced.length > 1 && ` – ${formatInr(Math.max(...priced.map((o) => o.amount!)))}`}
              </>
            )}
          </p>

          <details className="group text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Payment note{q.type === "checkboxes" ? " & selection limits" : ""}
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Input
                  value={p?.messageTemplate ?? DEFAULT_PAYMENT_MESSAGE}
                  maxLength={200}
                  aria-label="Payment note template"
                  onChange={(e) => set({ messageTemplate: e.target.value })}
                  className="h-8 text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_TOKENS.map(({ token, label }) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => set({ messageTemplate: `${(p?.messageTemplate ?? "").trimEnd()} ${token}`.trim() })}
                      className="border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  Shown in their UPI app: <span className="font-mono text-foreground">{preview || "—"}</span>
                </p>
              </div>
              {q.type === "checkboxes" && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`min-${q.id}`} className="text-xs">Min picks</Label>
                    <Input
                      id={`min-${q.id}`}
                      type="number"
                      min={0}
                      placeholder="Any"
                      value={p?.minSelections ?? ""}
                      onChange={(e) => set({ minSelections: numOrUndef(e.target.value) })}
                      className="h-8 w-24 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`max-${q.id}`} className="text-xs">Max picks</Label>
                    <Input
                      id={`max-${q.id}`}
                      type="number"
                      min={1}
                      placeholder="Any"
                      value={p?.maxSelections ?? ""}
                      onChange={(e) => set({ maxSelections: numOrUndef(e.target.value) || undefined })}
                      className="h-8 w-24 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

/** Editor for grid rows/columns — keyed by stable id so caret/focus survive edits. */
function GridListEditor({
  items,
  onChange,
  singular,
}: {
  items: GridItem[];
  onChange: (next: GridItem[]) => void;
  singular: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            value={item.label}
            placeholder={`${singular} ${i + 1}`}
            onChange={(e) => onChange(items.map((it) => (it.id === item.id ? { ...it, label: e.target.value } : it)))}
            className="h-8 text-sm"
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(items.filter((it) => it.id !== item.id))}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { id: newObjectId(), label: "" }])}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" /> Add {singular.toLowerCase()}
      </button>
    </div>
  );
}

export function FormQuestionEditor({
  sectionId,
  question: q,
  index,
  onGripPointerDown,
}: {
  sectionId: string;
  question: BuilderFormQuestion;
  index: number;
  onGripPointerDown?: (e: React.PointerEvent) => void;
}) {
  const {
    form,
    updateQuestion,
    removeQuestion,
    duplicateQuestion,
    changeQuestionType,
    addOption,
    removeOption,
    updateOption,
  } = useFormBuilderStore();
  const isQuiz = form.isQuiz;

  const setAnswerKey = (patch: Partial<AnswerKey>) =>
    updateQuestion(sectionId, q.id, { answerKey: { ...q.answerKey, ...patch } });

  const toggleCorrectOption = (optionId: string, multi: boolean) => {
    const current = q.answerKey?.correctOptionIds ?? [];
    let next: string[];
    if (multi) next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
    else next = current.includes(optionId) ? [] : [optionId];
    setAnswerKey({ correctOptionIds: next });
  };

  const isChoice = CHOICE_TYPES.includes(q.type);
  const isGrid = GRID_TYPES.includes(q.type);
  const isGradable = GRADABLE_TYPES.includes(q.type);

  return (
    <div className="border border-border bg-card">
      {/* Header: drag handle + type picker + actions */}
      <div className="flex items-center gap-2 border-b border-border p-3">
        <GripVertical
          className="h-4 w-4 shrink-0 cursor-grab touch-none text-muted-foreground"
          onPointerDown={onGripPointerDown}
        />
        <span className="text-xs font-semibold text-muted-foreground">Q{index + 1}</span>
        <div className="flex-1" />
        <select
          value={q.type}
          onChange={(e) => changeQuestionType(sectionId, q.id, e.target.value as FormQuestionType)}
          className="border border-border bg-background px-2 py-1 text-xs text-foreground"
        >
          {QUESTION_TYPE_META.map((m) => (
            <option key={m.type} value={m.type}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => duplicateQuestion(sectionId, q.id)}
          className="p-1 text-muted-foreground hover:text-foreground"
          title="Duplicate"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => removeQuestion(sectionId, q.id)}
          className="p-1 text-muted-foreground hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-4 p-4">
        <Input
          value={q.title}
          placeholder="Question title…"
          onChange={(e) => updateQuestion(sectionId, q.id, { title: e.target.value })}
        />

        {/* Choice options */}
        {isChoice && (
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <div key={opt.id} className="flex items-center gap-2">
                {q.type === "checkboxes" ? (
                  <div className="h-4 w-4 shrink-0 rounded-sm border-2 border-muted-foreground/40" />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40" />
                )}
                <Input
                  value={opt.text}
                  placeholder={`Option ${oi + 1}`}
                  onChange={(e) => updateOption(sectionId, q.id, opt.id, e.target.value)}
                  className="h-8 text-sm"
                />
                {q.payment?.enabled && (
                  <div className="relative w-28 shrink-0">
                    <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={MAX_AMOUNT}
                      step="0.01"
                      placeholder="Free"
                      value={opt.amount || ""}
                      aria-label={`Price for ${opt.text || `Option ${oi + 1}`}`}
                      onChange={(e) =>
                        updateOption(sectionId, q.id, opt.id, opt.text, Math.min(MAX_AMOUNT, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="h-8 pl-6 text-sm tabular-nums"
                    />
                  </div>
                )}
                {isQuiz && isGradable && (
                  <button
                    type="button"
                    onClick={() => toggleCorrectOption(opt.id, q.type === "checkboxes")}
                    className={`shrink-0 border px-2 py-1 text-[10px] font-medium ${
                      q.answerKey?.correctOptionIds?.includes(opt.id)
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-600"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    Correct
                  </button>
                )}
                {q.options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOption(sectionId, q.id, opt.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(sectionId, q.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add option
            </button>
            {q.type !== "dropdown" && (
              <PaymentSettings question={q} onChange={(payment) => updateQuestion(sectionId, q.id, { payment })} />
            )}
          </div>
        )}

        {/* Text preview */}
        {(q.type === "short_answer" || q.type === "paragraph") && (
          <div className="border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {q.type === "short_answer" ? "Short answer text" : "Long answer text"}
          </div>
        )}

        {/* Scale / rating */}
        {(q.type === "linear_scale" || q.type === "rating") && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Min</Label>
              <select
                value={q.scaleMin ?? 1}
                onChange={(e) => updateQuestion(sectionId, q.id, { scaleMin: Number(e.target.value) })}
                className="border border-border bg-background px-2 py-1 text-xs"
              >
                {[0, 1].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max</Label>
              <select
                value={q.scaleMax ?? 5}
                onChange={(e) => updateQuestion(sectionId, q.id, { scaleMax: Number(e.target.value) })}
                className="border border-border bg-background px-2 py-1 text-xs"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            {q.type === "linear_scale" && (
              <>
                <Input
                  value={q.scaleMinLabel ?? ""}
                  placeholder="Min label (optional)"
                  onChange={(e) => updateQuestion(sectionId, q.id, { scaleMinLabel: e.target.value })}
                  className="h-8 w-40 text-sm"
                />
                <Input
                  value={q.scaleMaxLabel ?? ""}
                  placeholder="Max label (optional)"
                  onChange={(e) => updateQuestion(sectionId, q.id, { scaleMaxLabel: e.target.value })}
                  className="h-8 w-40 text-sm"
                />
              </>
            )}
          </div>
        )}

        {/* Grids */}
        {isGrid && (
          <div className="space-y-5 border border-border bg-muted/30 p-4">
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rows
              </Label>
              <GridListEditor
                items={q.rows ?? []}
                singular="Row"
                onChange={(rows) => updateQuestion(sectionId, q.id, { rows })}
              />
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Columns
              </Label>
              <GridListEditor
                items={q.columns ?? []}
                singular="Column"
                onChange={(columns) => updateQuestion(sectionId, q.id, { columns })}
              />
            </div>
          </div>
        )}

        {/* Date / time preview */}
        {(q.type === "date" || q.type === "time") && (
          <Input type={q.type === "date" ? "date" : "time"} disabled className="w-48" />
        )}

        {/* File upload config */}
        {q.type === "file_upload" && (
          <p className="text-xs text-muted-foreground">Respondents must sign in to upload files, so this form requires sign-in.</p>
        )}
        {q.type === "file_upload" && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Max files</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={q.fileConfig?.maxFiles ?? 1}
                onChange={(e) =>
                  updateQuestion(sectionId, q.id, {
                    fileConfig: { ...(q.fileConfig ?? { maxSizeMb: 10, allowedTypes: [] }), maxFiles: Number(e.target.value) },
                  })
                }
                className="h-8 w-24 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max size (MB)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={q.fileConfig?.maxSizeMb ?? 10}
                onChange={(e) =>
                  updateQuestion(sectionId, q.id, {
                    fileConfig: { ...(q.fileConfig ?? { maxFiles: 1, allowedTypes: [] }), maxSizeMb: Number(e.target.value) },
                  })
                }
                className="h-8 w-24 text-sm"
              />
            </div>
          </div>
        )}

        {/* Text validation (short/paragraph) */}
        {(q.type === "short_answer" || q.type === "paragraph") && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Response validation
            </summary>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <select
                value={q.validation?.kind ?? ""}
                onChange={(e) =>
                  updateQuestion(sectionId, q.id, {
                    validation: e.target.value
                      ? { ...(q.validation ?? {}), kind: e.target.value as "length" | "regex" | "number_range" }
                      : undefined,
                  })
                }
                className="border border-border bg-background px-2 py-1"
              >
                <option value="">None</option>
                <option value="length">Length</option>
                <option value="number_range">Number range</option>
                <option value="regex">Regex</option>
              </select>
              {q.validation?.kind && q.validation.kind !== "regex" && (
                <>
                  <Input
                    type="number"
                    placeholder="min"
                    value={q.validation.min ?? ""}
                    onChange={(e) =>
                      updateQuestion(sectionId, q.id, {
                        validation: { ...q.validation!, min: e.target.value ? Number(e.target.value) : undefined },
                      })
                    }
                    className="h-8 w-20 text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="max"
                    value={q.validation.max ?? ""}
                    onChange={(e) =>
                      updateQuestion(sectionId, q.id, {
                        validation: { ...q.validation!, max: e.target.value ? Number(e.target.value) : undefined },
                      })
                    }
                    className="h-8 w-20 text-sm"
                  />
                </>
              )}
              {q.validation?.kind === "regex" && (
                <Input
                  placeholder="pattern"
                  value={q.validation.pattern ?? ""}
                  onChange={(e) =>
                    updateQuestion(sectionId, q.id, { validation: { ...q.validation!, pattern: e.target.value } })
                  }
                  className="h-8 w-40 text-sm"
                />
              )}
              {q.validation?.kind && (
                <Input
                  placeholder="Error message"
                  value={q.validation.message ?? ""}
                  onChange={(e) =>
                    updateQuestion(sectionId, q.id, { validation: { ...q.validation!, message: e.target.value } })
                  }
                  className="h-8 w-48 text-sm"
                />
              )}
            </div>
          </details>
        )}

        {/* Quiz answer key for short_answer */}
        {isQuiz && q.type === "short_answer" && (
          <Input
            placeholder="Correct answer"
            value={q.answerKey?.correctText ?? ""}
            onChange={(e) => setAnswerKey({ correctText: e.target.value })}
            className="h-8 text-sm"
          />
        )}
      </div>

      {/* Footer: required + points */}
      <div className="flex items-center justify-end gap-4 border-t border-border px-4 py-2.5">
        {isQuiz && isGradable && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Points</Label>
            <Input
              type="number"
              min={0}
              value={q.points ?? 0}
              onChange={(e) => updateQuestion(sectionId, q.id, { points: Number(e.target.value) })}
              className="h-8 w-16 text-sm"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch
            id={`req-${q.id}`}
            checked={q.isRequired}
            onCheckedChange={(v) => updateQuestion(sectionId, q.id, { isRequired: v })}
            className="scale-75"
          />
          <Label htmlFor={`req-${q.id}`} className="cursor-pointer text-xs text-muted-foreground">
            Required
          </Label>
        </div>
      </div>
    </div>
  );
}
