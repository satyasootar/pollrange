import api from "@/lib/api";
import type { DashboardOverview, TimelineGranularity } from "@/types";

export const dashboardApi = {
  overview: (groupBy: TimelineGranularity = "day") =>
    api.get<{ data: DashboardOverview }>("/dashboard/overview", { params: { groupBy } }),
};
