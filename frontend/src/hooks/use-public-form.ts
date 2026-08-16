import { useQuery, useMutation } from "@tanstack/react-query";
import { formPublicApi } from "@/api/form-public.api";
import type { SubmitFormResponsePayload } from "@/types";

export function usePublicForm(shareToken: string, sessionToken?: string) {
  return useQuery({
    queryKey: ["public-form", shareToken],
    queryFn: () => formPublicApi.get(shareToken, sessionToken),
    select: (res) => res.data.data,
    enabled: !!shareToken,
    retry: false,
  });
}

export function useSubmitFormResponse(formId: string) {
  return useMutation({
    mutationFn: (payload: SubmitFormResponsePayload) => formPublicApi.submit(formId, payload),
    // Error toast handled at the call site so guard screens can react to the status.
  });
}
