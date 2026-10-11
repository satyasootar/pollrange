import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";
import type { FormCleanupFilter, PlanId, TimelineGranularity, User } from "@/types";

/** Reads the server-computed flag from the ["me"] query ProtectedRoute already loaded. */
export function useIsAdmin() {
  const { data } = useQuery<User>({ queryKey: ["me"], enabled: false });
  return !!data?.isAdmin;
}

const LIVE = 10_000;

export const useAdminOverview = (groupBy: TimelineGranularity) =>
  useQuery({ queryKey: ["admin", "overview", groupBy], queryFn: () => adminApi.overview(groupBy), select: (r) => r.data.data, placeholderData: keepPreviousData });

export const useAdminUsers = (page: number, search: string, plan?: PlanId) =>
  useQuery({
    queryKey: ["admin", "users", page, search, plan],
    queryFn: () => adminApi.users({ page, ...(search ? { search } : {}), ...(plan ? { plan } : {}) }),
    select: (r) => r.data.data,
    placeholderData: keepPreviousData,
  });

export const useAdminUser = (userId: string) =>
  useQuery({ queryKey: ["admin", "user", userId], queryFn: () => adminApi.user(userId), select: (r) => r.data.data });

export const useAdminTraffic = () =>
  useQuery({ queryKey: ["admin", "traffic"], queryFn: adminApi.traffic, select: (r) => r.data.data, refetchInterval: LIVE });

export const useAdminSystem = () =>
  useQuery({ queryKey: ["admin", "system"], queryFn: adminApi.system, select: (r) => r.data.data, refetchInterval: LIVE });

export const useAdminStorage = () =>
  useQuery({ queryKey: ["admin", "storage"], queryFn: adminApi.storage, select: (r) => r.data.data, staleTime: 60_000 });

export const useAdminAudit = () =>
  useQuery({ queryKey: ["admin", "audit"], queryFn: adminApi.audit, select: (r) => r.data.data });

export const useFormCleanupPreview = () =>
  useMutation({ mutationFn: (filter: FormCleanupFilter) => adminApi.previewFormCleanup(filter).then((r) => r.data.data) });

export function useFormCleanup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FormCleanupFilter & { expectedForms: number }) =>
      adminApi.executeFormCleanup({ ...body, confirm: "DELETE" }).then((r) => r.data.data),
    // Totals, storage, user lists and the audit log all change after a cleanup.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useSetUserPlan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { plan: PlanId; expiresAt: string | null }) => adminApi.setUserPlan(userId, body).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export const useAdminPlanRequests = () =>
  useQuery({ queryKey: ["admin", "plan-requests"], queryFn: adminApi.planRequests, select: (r) => r.data.data, refetchInterval: 30_000 });

export function useDecidePlanRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; approve: true; expiresAt?: string | null } | { id: string; approve: false; reason?: string }) =>
      v.approve
        ? adminApi.approvePlanRequest(v.id, v.expiresAt === undefined ? {} : { expiresAt: v.expiresAt })
        : adminApi.rejectPlanRequest(v.id, v.reason ? { reason: v.reason } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}
