import { Plus, Trash2, X, Copy, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFormBuilderStore } from "@/store/use-form-builder-store";
import { QUESTION_TYPE_META, CHOICE_TYPES, GRID_TYPES, GRADABLE_TYPES } from "./question-types";
import { newObjectId } from "@/lib/utils";
import type { BuilderFormQuestion, FormQuestionType, AnswerKey, GridItem } from "@/types";

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
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={opt.amount ?? 0}
                    aria-label={`${opt.text || `Option ${oi + 1}`} amount`}
                    onChange={(e) => updateOption(sectionId, q.id, opt.id, opt.text, Math.max(0, Number(e.target.value)))}
                    className="h-8 w-24 text-sm"
                  />
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
              <div className="space-y-3 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm">Enable UPI payment</Label>
                    <p className="text-xs text-muted-foreground">Price each option and collect a payment intent.</p>
                  </div>
                  <Switch
                    checked={q.payment?.enabled ?? false}
                    onCheckedChange={(enabled) =>
                      updateQuestion(sectionId, q.id, {
                        payment: {
                          enabled,
                          upiId: q.payment?.upiId ?? "",
                          messageTemplate: q.payment?.messageTemplate ?? "Payment for {selected_options} - Total INR {total_amount}",
                          minSelections: q.payment?.minSelections,
                          maxSelections: q.payment?.maxSelections,
                        },
                      })
                    }
                  />
                </div>
                {q.payment?.enabled && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={q.payment.upiId}
                      placeholder="UPI ID / VPA"
                      onChange={(e) => updateQuestion(sectionId, q.id, { payment: { ...q.payment!, upiId: e.target.value } })}
                    />
                    <Input
                      value={q.payment.messageTemplate}
                      placeholder="Payment message template"
                      onChange={(e) => updateQuestion(sectionId, q.id, { payment: { ...q.payment!, messageTemplate: e.target.value } })}
                    />
                    {q.type === "checkboxes" && (
                      <>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Minimum selections"
                          value={q.payment.minSelections ?? ""}
                          onChange={(e) => updateQuestion(sectionId, q.id, { payment: { ...q.payment!, minSelections: e.target.value ? Number(e.target.value) : undefined } })}
                        />
                        <Input
                          type="number"
                          min="1"
                          placeholder="Maximum selections"
                          value={q.payment.maxSelections ?? ""}
                          onChange={(e) => updateQuestion(sectionId, q.id, { payment: { ...q.payment!, maxSelections: e.target.value ? Number(e.target.value) : undefined } })}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
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
