import { Check, FileText, Star } from "lucide-react";
import { QUESTION_TYPE_LABEL } from "@/components/form-builder/question-types";
import { cn } from "@/lib/utils";
import type { AnswerKey, FormQuestionSummary } from "@/types";

function Bar({ label, count, total, correct = false }: { label: string; count: number; total: number; correct?: boolean }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className={cn("flex min-w-0 items-center gap-1.5", correct && "font-semibold")}>
          <span className="truncate">{label}</span>
          {correct && (
            <span className="inline-flex shrink-0 items-center gap-0.5 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" /> Correct
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {count} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 w-full bg-muted">
        <div className={cn("h-full", correct ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Mirrors the server's short-answer grading (trimmed, case-insensitive). */
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * One question's results. For a quiz pass its `answerKey`: correct options are marked green and,
 * where the counts allow it, the share of people who got it right is shown.
 */
export function QuestionSummaryCard({ q, answerKey }: { q: FormQuestionSummary; answerKey?: AnswerKey | undefined }) {
  const correctIds = answerKey?.correctOptionIds ?? [];
  const correctText = answerKey?.correctText;
  // Exactly computable from the tallies only for one right option, or a typed answer.
  let rightPct: number | null = null;
  if (q.responseCount > 0 && q.options && correctIds.length === 1) {
    rightPct = ((q.options.find((o) => o.optionId === correctIds[0])?.count ?? 0) / q.responseCount) * 100;
  } else if (q.responseCount > 0 && q.values && correctText) {
    rightPct = (q.values.filter((v) => sameText(v, correctText)).length / q.responseCount) * 100;
  }

  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{q.title || "(untitled)"}</h3>
          <p className="text-xs text-muted-foreground">
            {QUESTION_TYPE_LABEL[q.type]} · {q.responseCount} response{q.responseCount !== 1 ? "s" : ""}
          </p>
        </div>
        {rightPct !== null && (
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold tabular-nums leading-none">{rightPct.toFixed(0)}%</p>
            <p className="mt-1 text-[11px] text-muted-foreground">got it right</p>
          </div>
        )}
      </div>

      {correctText && (
        <p className="mb-3 flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
          <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-muted-foreground">Correct answer:</span>
          <span className="font-semibold">{correctText}</span>
        </p>
      )}

      {/* Choice options */}
      {q.options && (
        <div className="space-y-3">
          {q.options.map((opt) => (
            <Bar key={opt.optionId} label={opt.text} count={opt.count} total={q.responseCount} correct={correctIds.includes(opt.optionId)} />
          ))}
        </div>
      )}

      {/* Scale / rating distribution */}
      {q.distribution && (
        <div className="space-y-3">
          {q.average != null && (
            <p className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="font-semibold">{q.average.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">average</span>
            </p>
          )}
          {Object.entries(q.distribution)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([value, count]) => (
              <Bar key={value} label={value} count={count} total={q.responseCount} />
            ))}
        </div>
      )}

      {/* Grid matrix */}
      {q.matrix && q.rows && q.columns && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-2" />
                {q.columns.map((col) => (
                  <th key={col} className="p-2 text-center text-xs font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.rows.map((row) => (
                <tr key={row} className="border-t border-border">
                  <td className="p-2 text-xs font-medium">{row}</td>
                  {q.columns!.map((col) => (
                    <td key={col} className="p-2 text-center tabular-nums">
                      {q.matrix?.[row]?.[col] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* File uploads */}
      {q.files && (
        <div className="space-y-2">
          {q.files.length === 0 && <p className="text-sm text-muted-foreground">No files uploaded.</p>}
          {q.files.map((f, i) => (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border border-border p-2 text-sm hover:border-primary"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{f.name}</span>
            </a>
          ))}
        </div>
      )}

      {/* Text / date / time values */}
      {q.values && (
        <div className="space-y-2">
          {q.values.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
          {q.values.slice(0, 100).map((v, i) => (
            <div
              key={i}
              className={cn(
                "border-l-2 bg-muted/30 px-3 py-2 text-sm",
                correctText && sameText(v, correctText) ? "border-emerald-500" : "border-border"
              )}
            >
              {v}
            </div>
          ))}
          {q.values.length > 100 && (
            <p className="text-xs text-muted-foreground">Showing first 100 of {q.values.length}.</p>
          )}
        </div>
      )}
    </div>
  );
}
