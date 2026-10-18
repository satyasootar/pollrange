import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { track } from "@/lib/tracker";
import { formsApi } from "@/api/forms.api";
import type { FormFilters, FormBuilderForm } from "@/types";
import { toastApiError } from "@/lib/utils";
import { toast } from "sonner";

export const formKeys = {
  all: ["forms"] as const,
  list: (filters: FormFilters) => ["forms", "list", filters] as const,
  detail: (id: string) => ["forms", "detail", id] as const,
  leaderboard: (id: string) => ["forms", "leaderboard", id] as const,
};

export function useForms(filters: FormFilters = {}) {
  return useQuery({
    queryKey: formKeys.list(filters),
    queryFn: () => formsApi.list(filters),
    select: (res) => res.data.data,
    placeholderData: keepPreviousData,
  });
}

export function useForm(formId: string) {
  return useQuery({
    queryKey: formKeys.detail(formId),
    queryFn: () => formsApi.get(formId),
    select: (res) => res.data.data,
    enabled: !!formId,
  });
}

export function useCreateForm() {
  const qc = useQueryClient();
  // No hook-level onError: the review step needs to distinguish validation
  // errors (show a fix-and-retry dialog) from generic failures (toast) itself.
  return useMutation({
    mutationFn: (form: FormBuilderForm) => formsApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.all });
      track("form_created");
      toast.success("Form created successfully!");
    },
  });
}

export function useUpdateForm(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormBuilderForm) => formsApi.update(formId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form updated.");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => formsApi.delete(formId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form deleted.");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useDuplicateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => formsApi.duplicate(formId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form duplicated.");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useCloseForm(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => formsApi.close(formId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form closed.");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useReopenForm(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expiresAt?: string | null) => formsApi.reopen(formId, expiresAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form reopened!");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useRegenerateFormToken(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => formsApi.regenerateToken(formId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("New share link generated.");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useFormLeaderboard(formId: string, enabled = true) {
  return useQuery({
    queryKey: formKeys.leaderboard(formId),
    queryFn: () => formsApi.leaderboard(formId),
    select: (res) => res.data.data,
    enabled: !!formId && enabled,
  });
}

/** Publishing closes the quiz and reveals the leaderboard + answer review on the share link. */
export function usePublishResults(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => formsApi.publish(formId, "permanent"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
      qc.invalidateQueries({ queryKey: formKeys.leaderboard(formId) });
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Results published. The leaderboard is live on your quiz link.");
    },
    onError: (err) => toastApiError(err),
  });
}

export function useUnpublishResults(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => formsApi.unpublish(formId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
      qc.invalidateQueries({ queryKey: formKeys.leaderboard(formId) });
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Results hidden from respondents.");
    },
    onError: (err) => toastApiError(err),
  });
}
