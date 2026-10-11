import api from "@/lib/api";
import type { AdminAuditEntry, FormCleanupFilter, FormCleanupPreview, FormCleanupResult, AdminOverview, AdminStorage, AdminSystem, AdminTraffic, AdminUserDetail, AdminUsersPage, TimelineGranularity } from "@/types";

export const adminApi = {
  overview: (groupBy: TimelineGranularity) => api.get<{ data: AdminOverview }>("/admin/overview", { params: { groupBy } }),
  users: (params: { page: number; search?: string }) => api.get<{ data: AdminUsersPage }>("/admin/users", { params }),
  user: (userId: string) => api.get<{ data: AdminUserDetail }>(`/admin/users/${userId}`),
  traffic: () => api.get<{ data: AdminTraffic }>("/admin/traffic"),
  system: () => api.get<{ data: AdminSystem }>("/admin/system"),
  storage: () => api.get<{ data: AdminStorage }>("/admin/storage"),
  previewFormCleanup: (filter: FormCleanupFilter) => api.post<{ data: FormCleanupPreview }>("/admin/cleanup/forms/preview", filter),
  executeFormCleanup: (body: FormCleanupFilter & { expectedForms: number; confirm: "DELETE" }) =>
    api.post<{ data: FormCleanupResult }>("/admin/cleanup/forms", body),
  audit: () => api.get<{ data: AdminAuditEntry[] }>("/admin/audit"),
};
