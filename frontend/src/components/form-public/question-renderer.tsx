import { Star, Upload, Loader2, X, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formPublicApi } from "@/api/form-public.api";
import { getApiErrorMessage, newObjectId } from "@/lib/utils";
import { toast } from "sonner";
import type { FormQuestion, FormFileValue, FormGridValue } from "@/types";

/** A file the respondent picked that is uploading in the background (or failed). */
export interface FilePreview {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
  status: "uploading" | "error";
}

export interface AnswerDraft {
  textValue?: string | null;
  numberValue?: number | null;
  dateValue?: string | null;
  selectedOptionIds?: string[];
  scaleValue?: number | null;
  gridValues?: FormGridValue[];
  fileUrls?: FormFileValue[];
  filePreviews?: FilePreview[];
}

/** onChange accepts a functional updater so concurrent background uploads never clobber each other. */
export type AnswerChange = (patch: AnswerDraft | ((prev: AnswerDraft) => AnswerDraft)) => void;

interface Props {
  formId: string;
  question: FormQuestion;
  value: AnswerDraft;
  onChange: AnswerChange;
  /** Preview mode (Review step): render inputs but disable the live file upload. */
  preview?: boolean;
}

export function QuestionRenderer({ formId, question: q, value, onChange, preview }: Props) {
  const toggleOption = (optionId: string, multi: boolean) => {
    const current = value.selectedOptionIds ?? [];
    const next = multi
      ? current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
      : [optionId];
    onChange({ selectedOptionIds: next });
  };

  const setGrid = (row: string, col: string, multi: boolean) => {
    const grids = value.gridValues ?? [];
    const existing = grids.find((g) => g.row === row);
    let cols: string[];
    if (!existing) cols = [col];
    else if (multi) cols = existing.columns.includes(col) ? existing.columns.filter((c) => c !== col) : [...existing.columns, col];
    else cols = [col];
    const next = [...grids.filter((g) => g.row !== row), { row, columns: cols }];
    onChange({ gridValues: next });
  };

  const gridSelected = (row: string, col: string) =>
    value.gridValues?.find((g) => g.row === row)?.columns.includes(col) ?? false;

  // Show a preview immediately, then upload each file in the background. The submit
  // button (in the parent) stays disabled until every "uploading" preview clears.
  const handleFiles = (files: FileList) => {
    const max = q.fileConfig?.maxFiles ?? 1;
    const inFlight = value.filePreviews?.filter((f) => f.status === "uploading").length ?? 0;
    const current = (value.fileUrls?.length ?? 0) + inFlight;
    if (current + files.length > max) {
      toast.error(`You can upload at most ${max} file${max !== 1 ? "s" : ""}.`);
      return;
    }
    const sizeCap = (q.fileConfig?.maxSizeMb ?? 10) * 1024 * 1024;
    for (const file of Array.from(files)) {
      if (file.size > sizeCap) {
        toast.error(`${file.name} exceeds the ${q.fileConfig?.maxSizeMb ?? 10}MB limit.`);
        continue;
      }
      const id = newObjectId();
      const isImage = file.type.startsWith("image/");
      const url = isImage ? URL.createObjectURL(file) : "";
      onChange((prev) => ({
        ...prev,
        filePreviews: [...(prev.filePreviews ?? []), { id, name: file.name, url, isImage, status: "uploading" }],
      }));
      formPublicApi
        .uploadFile(formId, file)
        .then((res) => {
          if (url) URL.revokeObjectURL(url);
          onChange((prev) => ({
            ...prev,
            filePreviews: (prev.filePreviews ?? []).filter((f) => f.id !== id),
            fileUrls: [...(prev.fileUrls ?? []), res.data.data],
          }));
        })
        .catch((err) => {
          toast.error(getApiErrorMessage(err));
          onChange((prev) => ({
            ...prev,
            filePreviews: (prev.filePreviews ?? []).map((f) => (f.id === id ? { ...f, status: "error" } : f)),
          }));
        });
    }
  };

  switch (q.type) {
    case "short_answer":
      return (
        <Input
          value={value.textValue ?? ""}
          placeholder="Your answer"
          onChange={(e) => onChange({ textValue: e.target.value })}
        />
      );

    case "paragraph":
      return (
        <Textarea
          value={value.textValue ?? ""}
          rows={4}
          placeholder="Your answer"
          onChange={(e) => onChange({ textValue: e.target.value })}
        />
      );

    case "multiple_choice":
    case "checkboxes": {
      const multi = q.type === "checkboxes";
      return (
        <div className="space-y-2">
          {(q.options ?? []).map((opt) => {
            const selected = value.selectedOptionIds?.includes(opt._id) ?? false;
            return (
              <button
                key={opt._id}
                type="button"
                onClick={() => toggleOption(opt._id, multi)}
                className={`flex w-full items-center gap-3 border p-3 text-left text-sm transition-colors ${
                  selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-foreground/30 hover:bg-muted"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border-2 ${multi ? "rounded" : "rounded-full"} ${
                    selected ? "border-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {selected && <span className={`h-2 w-2 ${multi ? "rounded-sm" : "rounded-full"} bg-primary`} />}
                </span>
                {opt.text}
              </button>
            );
          })}
        </div>
      );
    }

    case "dropdown":
      return (
        <select
          value={value.selectedOptionIds?.[0] ?? ""}
          onChange={(e) => onChange({ selectedOptionIds: e.target.value ? [e.target.value] : [] })}
          className="w-full border border-border bg-background p-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Choose…</option>
          {(q.options ?? []).map((opt) => (
            <option key={opt._id} value={opt._id}>
              {opt.text}
            </option>
          ))}
        </select>
      );

    case "linear_scale": {
      const min = q.scaleMin ?? 1;
      const max = q.scaleMax ?? 5;
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div className="flex items-center gap-3">
          {q.scaleMinLabel && <span className="text-xs text-muted-foreground">{q.scaleMinLabel}</span>}
          <div className="flex flex-wrap gap-2">
            {nums.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ scaleValue: n })}
                className={`h-10 w-10 border text-sm transition-colors ${
                  value.scaleValue === n ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-foreground/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {q.scaleMaxLabel && <span className="text-xs text-muted-foreground">{q.scaleMaxLabel}</span>}
        </div>
      );
    }

    case "rating": {
      const max = q.scaleMax ?? 5;
      return (
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => onChange({ scaleValue: n })}>
              <Star
                className={`h-7 w-7 transition-colors ${
                  (value.scaleValue ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
        </div>
      );
    }

    case "date":
      return (
        <Input
          type="date"
          value={value.dateValue ?? ""}
          onChange={(e) => onChange({ dateValue: e.target.value })}
          className="w-48"
        />
      );

    case "time":
      return (
        <Input
          type="time"
          value={value.dateValue ?? ""}
          onChange={(e) => onChange({ dateValue: e.target.value })}
          className="w-40"
        />
      );

    case "multiple_choice_grid":
    case "checkbox_grid": {
      const multi = q.type === "checkbox_grid";
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-2" />
                {(q.columns ?? []).map((col, ci) => (
                  <th key={ci} className="p-2 text-center text-xs font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(q.rows ?? []).map((row, ri) => (
                <tr key={ri} className="border-t border-border">
                  <td className="p-2 text-xs font-medium">{row}</td>
                  {(q.columns ?? []).map((col, ci) => (
                    <td key={ci} className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => setGrid(row, col, multi)}
                        className={`mx-auto flex h-5 w-5 items-center justify-center border-2 ${multi ? "rounded" : "rounded-full"} ${
                          gridSelected(row, col) ? "border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {gridSelected(row, col) && <span className={`h-2.5 w-2.5 ${multi ? "rounded-sm" : "rounded-full"} bg-primary`} />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "file_upload": {
      const files = value.fileUrls ?? [];
      const previews = value.filePreviews ?? [];
      const max = q.fileConfig?.maxFiles ?? 1;
      const total = files.length + previews.length;
      return (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={`u-${i}`} className="flex items-center gap-2 border border-border p-2 text-sm">
              {f.mimeType?.startsWith("image/") ? (
                <img src={f.url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, fileUrls: (prev.fileUrls ?? []).filter((_, j) => j !== i) }))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {previews.map((p) => (
            <div key={p.id} className="flex items-center gap-2 border border-border p-2 text-sm">
              {p.isImage && p.url ? (
                <img src={p.url} alt="" className="h-10 w-10 shrink-0 rounded object-cover opacity-70" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{p.name}</span>
              {p.status === "uploading" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <span className="text-xs text-destructive">Failed</span>
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, filePreviews: (prev.filePreviews ?? []).filter((f) => f.id !== p.id) }))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
          {total < max && (
            <label
              className={`flex items-center justify-center gap-2 border border-dashed border-border py-4 text-sm text-muted-foreground ${
                preview ? "pointer-events-none opacity-50" : "cursor-pointer hover:border-primary hover:text-primary"
              }`}
            >
              <Upload className="h-4 w-4" />
              {preview ? "File upload (disabled in preview)" : `Upload file (max ${q.fileConfig?.maxSizeMb ?? 10}MB)`}
              <input
                type="file"
                multiple={max > 1}
                className="hidden"
                disabled={preview}
                onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
