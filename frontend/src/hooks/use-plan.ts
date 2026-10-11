import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/api/billing.api";
import type { BillingPeriod, PlanFeature, PlanRequest } from "@/types";

/** Public catalog — changes only on deploy. */
export const usePlans = () =>
  useQuery({ queryKey: ["plans"], queryFn: billingApi.plans, select: (r) => r.data.data, staleTime: Infinity });

export const usePlanState = () =>
  useQuery({ queryKey: ["billing", "me"], queryFn: billingApi.me, select: (r) => r.data.data, staleTime: 60_000 });

/** Optimistic while loading so locked UI never flashes for paying users; the server enforces anyway. */
export function useCanUse(feature: PlanFeature) {
  const { data } = usePlanState();
  return data ? data.features[feature] : true;
}

export const useMyPlanRequests = () =>
  useQuery({ queryKey: ["billing", "requests"], queryFn: billingApi.myRequests, select: (r) => r.data.data });

export function useRequestUpgrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { plan: PlanRequest["plan"]; period: BillingPeriod; note?: string }) => billingApi.requestUpgrade(body).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
  });
}

export function useCancelPlanRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billingApi.cancelRequest(id).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
  });
}
