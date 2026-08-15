import { Users } from "lucide-react";
import type { RespondentEntry } from "@/types";
import { formatDatetime } from "@/lib/utils";

interface RespondentsListProps {
  respondents: RespondentEntry[];
  isLoading: boolean;
}

export function RespondentsList({ respondents, isLoading }: RespondentsListProps) {
  return (
    <div className="border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Respondents</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {respondents.length} response{respondents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="p-5 text-sm text-muted-foreground">Loading respondents…</div>
      ) : respondents.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">No responses yet.</div>
      ) : (
        <div className="max-h-80 divide-y divide-border overflow-y-auto">
          {respondents.map((r) => (
            <div
              key={r.responseId}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                {r.email && (
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDatetime(r.submittedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
