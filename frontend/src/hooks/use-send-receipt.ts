import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { analyticsApi } from "@/api/analytics.api";
import { formAnalyticsApi } from "@/api/form-analytics.api";
import { analyticsKeys } from "@/hooks/use-analytics";
import { toastApiError } from "@/lib/utils";

/** Creator-triggered (re)send of a respondent's emailed copy; refreshes the list so the status updates. */
export function useSendReceipt(kind: "poll" | "form", id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (responseId: string) =>
      (kind === "poll" ? analyticsApi.sendReceipt(id, responseId) : formAnalyticsApi.sendReceipt(id, responseId)).then((r) => r.data.data),
    onSuccess: (r) => {
      if (r?.status === "sent") toast.success(`Copy sent to ${r.to}`);
      else toast.error(`Couldn't send the email${r?.error ? `: ${r.error}` : ""}`);
      void qc.invalidateQueries({ queryKey: kind === "poll" ? analyticsKeys.respondents(id) : ["form-analytics", "responses", id] });
    },
    onError: (err) => toastApiError(err),
  });
}
