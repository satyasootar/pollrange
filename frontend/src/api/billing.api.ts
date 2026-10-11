import api from "@/lib/api";
import type { BillingPeriod, PlanCatalogEntry, PlanRequest, PlanState } from "@/types";

export const billingApi = {
  plans: () => api.get<{ data: PlanCatalogEntry[] }>("/plans"),
  me: () => api.get<{ data: PlanState }>("/billing/me"),
  requestUpgrade: (body: { plan: PlanRequest["plan"]; period: BillingPeriod; note?: string }) =>
    api.post<{ data: PlanRequest }>("/billing/requests", body),
  myRequests: () => api.get<{ data: PlanRequest[] }>("/billing/requests/me"),
  cancelRequest: (id: string) => api.delete<{ data: PlanRequest }>(`/billing/requests/${id}`),
};
