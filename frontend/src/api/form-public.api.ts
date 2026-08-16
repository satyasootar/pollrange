import api from "@/lib/api";
import type { PublicForm, SubmitFormResponsePayload, SubmitFormResult, FormFileValue } from "@/types";

export const formPublicApi = {
  get: (shareToken: string, sessionToken?: string) =>
    api.get<{ data: PublicForm }>(`/public/forms/${shareToken}`, {
      params: sessionToken ? { sessionToken } : {},
    }),

  status: (shareToken: string, sessionToken?: string) =>
    api.get<{ data: { status: string; isExpired: boolean; alreadyResponded: boolean } }>(
      `/public/forms/${shareToken}/status`,
      { params: sessionToken ? { sessionToken } : {} }
    ),

  submit: (formId: string, payload: SubmitFormResponsePayload) =>
    api.post<{ data: SubmitFormResult }>(`/form-responses/${formId}`, payload),

  uploadFile: (formId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ data: FormFileValue }>(`/form-responses/${formId}/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
