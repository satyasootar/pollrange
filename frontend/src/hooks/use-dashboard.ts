import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard.api";
import type { TimelineGranularity } from "@/types";

export function useDashboardOverview(groupBy: TimelineGranularity = "day") {
  return useQuery({
    queryKey: ["dashboard", "overview", groupBy],
    queryFn: () => dashboardApi.overview(groupBy),
    select: (res) => res.data.data,
    placeholderData: keepPreviousData,
  });
}
