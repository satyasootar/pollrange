import { FileText, Star } from "lucide-react";
import { QUESTION_TYPE_LABEL } from "@/components/form-builder/question-types";
import type { FormQuestionSummary } from "@/types";

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate pr-2">{label}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {count} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 w-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function QuestionSummaryCard({ q }: { q: FormQuestionSummary }) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{q.title || "(untitled)"}</h3>
          <p className="text-xs text-muted-foreground">
            {QUESTION_TYPE_LABEL[q.type]} · {q.responseCount} response{q.responseCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Choice options */}
      {q.options && (
        <div className="space-y-3">
          {q.options.map((opt) => (
            <Bar key={opt.optionId} label={opt.optionText} count={opt.count} total={q.responseCount} />
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
            <div key={i} className="border-l-2 border-border bg-muted/30 px-3 py-2 text-sm">
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
