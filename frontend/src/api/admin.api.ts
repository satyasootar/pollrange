import api from "@/lib/api";
import type { AdminPlanRequest, PlanId, AdminAuditEntry, FormCleanupFilter, FormCleanupPreview, FormCleanupResult, AdminOverview, AdminStorage, AdminSystem, AdminTraffic, AdminUserDetail, AdminUsersPage, TimelineGranularity, AdminSiteAnalytics, AdminConsentReport, ReportDays } from "@/types";

export const adminApi = {
  overview: (groupBy: TimelineGranularity) => api.get<{ data: AdminOverview }>("/admin/overview", { params: { groupBy } }),
  users: (params: { page: number; search?: string; plan?: PlanId }) => api.get<{ data: AdminUsersPage }>("/admin/users", { params }),
  setUserPlan: (userId: string, body: { plan: PlanId; expiresAt: string | null }) =>
    api.patch<{ data: { plan: PlanId; expiresAt: string | null } }>(`/admin/users/${userId}/plan`, body),
  user: (userId: string) => api.get<{ data: AdminUserDetail }>(`/admin/users/${userId}`),
  traffic: () => api.get<{ data: AdminTraffic }>("/admin/traffic"),
  siteAnalytics: (days: ReportDays) => api.get<{ data: AdminSiteAnalytics }>("/admin/site-analytics", { params: { days } }),
  consent: (days: ReportDays) => api.get<{ data: AdminConsentReport }>("/admin/consent", { params: { days } }),
  system: () => api.get<{ data: AdminSystem }>("/admin/system"),
  storage: () => api.get<{ data: AdminStorage }>("/admin/storage"),
  previewFormCleanup: (filter: FormCleanupFilter) => api.post<{ data: FormCleanupPreview }>("/admin/cleanup/forms/preview", filter),
  executeFormCleanup: (body: FormCleanupFilter & { expectedForms: number; confirm: "DELETE" }) =>
    api.post<{ data: FormCleanupResult }>("/admin/cleanup/forms", body),
  audit: () => api.get<{ data: AdminAuditEntry[] }>("/admin/audit"),
  planRequests: () => api.get<{ data: AdminPlanRequest[] }>("/admin/plan-requests"),
  approvePlanRequest: (id: string, body: { expiresAt?: string | null }) => api.post(`/admin/plan-requests/${id}/approve`, body),
  rejectPlanRequest: (id: string, body: { reason?: string }) => api.post(`/admin/plan-requests/${id}/reject`, body),
};
