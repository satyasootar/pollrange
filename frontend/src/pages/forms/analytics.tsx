import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  Copy,
  Download,
  AlertCircle,
  MoreVertical,
  QrCode,
  Camera,
  RefreshCcw,
  Lock,
  Unlock,
  Trophy,
  Files,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimelineChart } from "@/components/analytics/timeline-chart";
import { SnapshotDialog, type SnapshotData } from "@/components/analytics/snapshot-dialog";
import { QRCardDialog } from "@/components/analytics/qr-card-dialog";
import { ReopenPollDialog } from "@/components/analytics/reopen-poll-dialog";
import { QuestionSummaryCard } from "@/components/form-analytics/question-summary-card";
import { formKeys, useForm, useCloseForm, useReopenForm, useRegenerateFormToken, useDuplicateForm } from "@/hooks/use-forms";
import { useAuthStore } from "@/store/use-auth-store";
import { isFormLocked } from "@/lib/form-mappers";
import { LeaderboardPanel } from "@/components/quiz-results/leaderboard-panel";
import { LiveQuizControl } from "@/components/quiz-results/live-quiz-control";
import { useFormSummary, useFormTimeline, useFormQuestionSummaries, useFormResponses, formAnalyticsKeys } from "@/hooks/use-form-analytics";
import { useFormSocket } from "@/hooks/use-form-socket";
import { useSendReceipt } from "@/hooks/use-send-receipt";
import { ReceiptStatus, ReceiptSummary } from "@/components/analytics/receipt-status";
import { formAnalyticsApi } from "@/api/form-analytics.api";
import { buildFormShareUrl, copyToClipboard, formatDatetime, downloadBlob, cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatInr } from "@/lib/upi-payment";
import type {
  Form,
  FormQuestion,
  FormSummary,
  FormQuestionSummary,
  IndividualFormResponse,
  FormAnswerPayload,
  ReceiptFilter,
  TimelineGranularity,
} from "@/types";

/** The snapshot card only shows aggregate bars: choice and scale questions (no free text, files or grids). */
function toSnapshot(form: Form, summary: FormSummary, questions: FormQuestionSummary[]): SnapshotData {
  const pct = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 100) : 0);
  return {
    pollId: form._id,
    pollTitle: form.title,
    totalResponses: summary.totalResponses,
    completionRate: Math.round(summary.completionRate),
    questions: questions.flatMap((q) => {
      const options =
        q.options?.map((o) => ({ optionId: o.optionId, optionText: o.text, count: o.count, percentage: pct(o.count, q.responseCount) })) ??
        (q.distribution &&
          Object.entries(q.distribution)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([value, count]) => ({ optionId: value, optionText: value, count, percentage: pct(count, q.responseCount) })));
      return options ? [{ questionId: q.questionId, questionText: q.title, type: "single_choice" as const, options }] : [];
    }),
  };
}

/** Renders a single answer value in human-readable form. */
function AnswerValue({
  answer,
  question,
}: {
  answer: FormAnswerPayload & { questionTitleSnapshot?: string };
  question?: FormQuestion;
}) {
  if (answer.skipped) return <span className="text-muted-foreground">Skipped</span>;
  if (answer.selectedOptionIds?.length && question?.options) {
    const texts = answer.selectedOptionIds.map(
      (id) => question.options?.find((o) => o._id === id)?.text ?? id
    );
    return <span>{texts.join(", ")}</span>;
  }
  if (answer.gridValues?.length) {
    return <span>{answer.gridValues.map((g) => `${g.row}: ${g.columns.join(", ")}`).join(" | ")}</span>;
  }
  if (answer.fileUrls?.length) {
    return (
      <span className="flex flex-col gap-1">
        {answer.fileUrls.map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noreferrer" className="text-primary underline">
            {f.name}
          </a>
        ))}
      </span>
    );
  }
  if (answer.scaleValue != null) return <span>{answer.scaleValue}</span>;
  return <span>{answer.textValue ?? answer.dateValue ?? (answer.numberValue != null ? String(answer.numberValue) : "No answer")}</span>;
}

/** Shared by the Individual and Table tabs so the emailed-copy filter carries across. */
interface ResponsesViewProps {
  formId: string;
  form: Form;
  receiptFilter: ReceiptFilter | undefined;
  onReceiptFilter: (f: ReceiptFilter | undefined) => void;
}

function IndividualResponses({ formId, form, receiptFilter, onReceiptFilter }: ResponsesViewProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFormResponses(formId, page, 20, receiptFilter);
  const sendReceipt = useSendReceipt("form", formId);
  const questionsById = useMemo(() => {
    const map = new Map<string, FormQuestion>();
    form.sections.forEach((s) => s.questions.forEach((q) => map.set(q._id, q)));
    return map;
  }, [form]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading responses…</p>;
  if (!data || (data.items.length === 0 && !receiptFilter))
    return <p className="py-12 text-center text-sm text-muted-foreground">No responses yet.</p>;

  return (
    <div className="space-y-4">
      <ReceiptSummary
        summary={data.receiptSummary}
        filter={receiptFilter}
        onFilter={(f) => {
          setPage(1);
          onReceiptFilter(f);
        }}
      />
      {data.items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No responses match this filter.</p>}
      {data.items.map((r: IndividualFormResponse) => (
        <div key={r.responseId} className="border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="text-sm font-semibold">{r.name}</p>
              {r.email && <p className="text-xs text-muted-foreground">{r.email}</p>}
              <div className="mt-2">
                <ReceiptStatus
                  receipt={r.receipt}
                  history={r.receiptHistory}
                  email={r.email}
                  sending={sendReceipt.isPending && sendReceipt.variables === r.responseId}
                  onSend={() => sendReceipt.mutate(r.responseId)}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{formatDatetime(r.submittedAt)}</p>
              {form.isQuiz && r.totalPoints != null && (
                <p className="text-sm font-semibold text-primary">
                  {r.score ?? 0} / {r.totalPoints}
                </p>
              )}
              {r.payment && (
                <p className="text-sm font-semibold tabular-nums text-primary" title="Amount due via UPI">
                  {formatInr(r.payment.totalAmount)} due
                </p>
              )}
            </div>
          </div>
          {r.payment && (
            <p className="mb-3 border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground" title="UPI note to match against your bank statement">
              {r.payment.message}
            </p>
          )}
          <div className="space-y-3">
            {r.answers.map((a, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-muted-foreground">
                  {a.questionTitleSnapshot ?? questionsById.get(a.questionId)?.title ?? "Question"}
                </p>
                <p className="text-sm">
                  <AnswerValue answer={a} question={questionsById.get(a.questionId)} />
                  {form.isQuiz && a.isCorrect != null && (
                    <span className={cn("ml-2 text-xs", a.isCorrect ? "text-emerald-600" : "text-destructive")}>
                      {a.isCorrect ? "✓" : "✗"}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!data.pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!data.pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function ResponsesTable({ formId, form, receiptFilter, onReceiptFilter }: ResponsesViewProps) {
  const { data, isLoading } = useFormResponses(formId, 1, 100, receiptFilter);
  const sendReceipt = useSendReceipt("form", formId);
  const questions = useMemo(() => form.sections.flatMap((s) => s.questions), [form]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data || (data.items.length === 0 && !receiptFilter))
    return <p className="py-12 text-center text-sm text-muted-foreground">No responses yet.</p>;

  return (
    <div className="space-y-4">
      <ReceiptSummary summary={data.receiptSummary} filter={receiptFilter} onFilter={onReceiptFilter} />
      {data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No responses match this filter.</p>
      ) : (
    <div className="overflow-x-auto border border-border">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="whitespace-nowrap p-3 text-left text-xs font-semibold">Submitted</th>
            <th className="whitespace-nowrap p-3 text-left text-xs font-semibold">Respondent</th>
            <th className="whitespace-nowrap p-3 text-left text-xs font-semibold">Emailed copy</th>
            {questions.map((q) => (
              <th key={q._id} className="whitespace-nowrap p-3 text-left text-xs font-semibold">
                {q.title || "(untitled)"}
              </th>
            ))}
            {form.isQuiz && <th className="p-3 text-left text-xs font-semibold">Score</th>}
          </tr>
        </thead>
        <tbody>
          {data.items.map((r) => {
            const byId = new Map(r.answers.map((a) => [a.questionId, a]));
            return (
              <tr key={r.responseId} className="border-t border-border">
                <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{formatDatetime(r.submittedAt)}</td>
                <td className="whitespace-nowrap p-3">
                  {r.name}
                  {r.email && <span className="block text-xs text-muted-foreground">{r.email}</span>}
                </td>
                <td className="p-3 align-top">
                  <ReceiptStatus
                    receipt={r.receipt}
                    history={r.receiptHistory}
                    email={r.email}
                    sending={sendReceipt.isPending && sendReceipt.variables === r.responseId}
                    onSend={() => sendReceipt.mutate(r.responseId)}
                  />
                </td>
                {questions.map((q) => (
                  <td key={q._id} className="p-3 align-top">
                    {byId.get(q._id) ? <AnswerValue answer={byId.get(q._id)!} question={q} /> : <span className="text-muted-foreground">No answer</span>}
                  </td>
                ))}
                {form.isQuiz && (
                  <td className="whitespace-nowrap p-3">
                    {r.score ?? 0}/{r.totalPoints ?? 0}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
      )}
    </div>
  );
}

export function FormAnalyticsPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState("summary");
  const [isQROpen, setIsQROpen] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const close = useCloseForm(formId!);
  const reopen = useReopenForm(formId!);
  const regenerateToken = useRegenerateFormToken(formId!);
  const duplicate = useDuplicateForm();
  const { data: form, isLoading } = useForm(formId!);
  const { data: summary } = useFormSummary(formId!);
  const { data: questionSummaries } = useFormQuestionSummaries(formId!);
  const [timelineGroupBy, setTimelineGroupBy] = useState<TimelineGranularity>("day");
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter | undefined>();
  const { data: timeline } = useFormTimeline(formId!, timelineGroupBy);

  useFormSocket({
    formId: formId!,
    onAnalyticsUpdate: () => {
      qc.invalidateQueries({ queryKey: formAnalyticsKeys.summary(formId!) });
      qc.invalidateQueries({ queryKey: ["form-analytics", "timeline", formId!] });
      qc.invalidateQueries({ queryKey: formAnalyticsKeys.questions(formId!) });
      qc.invalidateQueries({ queryKey: ["form-analytics", "responses", formId!] });
      qc.invalidateQueries({ queryKey: formKeys.leaderboard(formId!) });
    },
    // Timer ended / auto-published / published elsewhere.
    onStatusChange: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId!) });
      qc.invalidateQueries({ queryKey: formKeys.leaderboard(formId!) });
    },
  });

  const handleExport = async () => {
    try {
      const res = await formAnalyticsApi.exportCsv(formId!);
      downloadBlob(res.data as Blob, `${form?.title ?? "form"}-responses.csv`);
    } catch {
      toast.error("Export failed.");
    }
  };

  if (isLoading) return null;
  if (!form) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <AlertCircle className="mr-2 h-5 w-5 text-destructive" /> Form not found.
      </div>
    );
  }

  const shareUrl = buildFormShareUrl(form.shareToken);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Mobile first: title row, then actions; side by side from sm. */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:h-20 md:px-8 md:py-0">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/forms")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{form.title}</h1>
            <p className="text-xs text-muted-foreground">
              {summary?.totalResponses ?? form.totalResponses} response
              {(summary?.totalResponses ?? form.totalResponses) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
          <Button variant="ghost" size="icon" title="Copy share link" onClick={async () => {
            await copyToClipboard(shareUrl);
            toast.success("Share link copied!");
          }}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Open form" onClick={() => window.open(`/f/${form.shareToken}`, "_blank")}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          {!isFormLocked(form) && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/forms/${form._id}/edit`)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          {/* Publish / hide (with its confirm + confetti) lives on the Leaderboard tab. */}
          {form.isQuiz && (
            <Button size="sm" className="gap-1.5" onClick={() => setTab("leaderboard")}>
              <Trophy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{form.isResultsPublic ? "Results Published" : "Publish Results"}</span>
              <span className="sm:hidden">{form.isResultsPublic ? "Published" : "Publish"}</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" title="More actions" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsQROpen(true)}>
                <QrCode className="mr-2 h-4 w-4" /> QR Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSnapshotOpen(true)} disabled={!summary || !questionSummaries}>
                <Camera className="mr-2 h-4 w-4" /> Take Snapshot
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </DropdownMenuItem>
              {isFormLocked(form) && (
                <DropdownMenuItem
                  disabled={duplicate.isPending}
                  onClick={() =>
                    duplicate.mutate(form._id, { onSuccess: (res) => navigate(`/forms/${res.data.data._id}/edit`) })
                  }
                >
                  <Files className="mr-2 h-4 w-4" /> Duplicate &amp; Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={regenerateToken.isPending}
                onClick={() => {
                  if (confirm("Generate a new share link? The current link (including any custom slug) will stop working."))
                    regenerateToken.mutate();
                }}
              >
                <RefreshCcw className={cn("mr-2 h-4 w-4", regenerateToken.isPending && "animate-spin")} /> Regenerate Link
              </DropdownMenuItem>
              {form.status === "active" && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm("Close this form? It will stop accepting responses.")) close.mutate();
                  }}
                >
                  <Lock className="mr-2 h-4 w-4" /> Close {form.isQuiz ? "Quiz" : "Form"}
                </DropdownMenuItem>
              )}
              {form.status === "closed" && (
                <DropdownMenuItem onClick={() => setIsReopenOpen(true)}>
                  <Unlock className="mr-2 h-4 w-4" /> Reopen {form.isQuiz ? "Quiz" : "Form"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {form.isQuiz && form.quizTimer?.mode === "live" && (
          <LiveQuizControl form={form} responses={summary?.totalResponses ?? form.totalResponses} />
        )}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="-mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
              {form.isQuiz && <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Responses" value={summary?.totalResponses ?? 0} />
              <StatTile label="Completion" value={`${(summary?.completionRate ?? 0).toFixed(0)}%`} />
              <StatTile label="Status" value={form.status} />
              {form.isQuiz && summary?.quiz && (
                <StatTile label="Avg score" value={`${summary.quiz.averageScore.toFixed(1)}/${summary.quiz.totalPoints}`} />
              )}
            </div>

            {summary && summary.totalResponses > 0 && (
              <TimelineChart
                data={timeline ?? []}
                groupBy={timelineGroupBy}
                onGroupByChange={setTimelineGroupBy}
              />
            )}

            <div className="space-y-4">
              {questionSummaries?.map((q) => (
                <QuestionSummaryCard key={q.questionId} q={q} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="individual">
            <IndividualResponses formId={formId!} form={form} receiptFilter={receiptFilter} onReceiptFilter={setReceiptFilter} />
          </TabsContent>

          {form.isQuiz && (
            <TabsContent value="leaderboard">
              <LeaderboardPanel form={form} />
            </TabsContent>
          )}

          <TabsContent value="table">
            <ResponsesTable formId={formId!} form={form} receiptFilter={receiptFilter} onReceiptFilter={setReceiptFilter} />
          </TabsContent>
        </Tabs>
      </div>

      {summary && questionSummaries && (
        <SnapshotDialog
          isOpen={isSnapshotOpen}
          onClose={() => setIsSnapshotOpen(false)}
          analytics={toSnapshot(form, summary, questionSummaries)}
          shareUrl={shareUrl}
        />
      )}

      <ReopenPollDialog
        noun={form.isQuiz ? "quiz" : "form"}
        open={isReopenOpen}
        onOpenChange={setIsReopenOpen}
        isPending={reopen.isPending}
        onConfirm={(expiresAt) => reopen.mutate(expiresAt, { onSuccess: () => setIsReopenOpen(false) })}
      />

      {isQROpen && (
        <QRCardDialog
          id={form._id}
          shareUrl={shareUrl}
          title={form.title}
          defaultBranding={user?.branding}
          open={isQROpen}
          onOpenChange={setIsQROpen}
        />
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-2 border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold capitalize tabular-nums">{value}</p>
    </div>
  );
}
