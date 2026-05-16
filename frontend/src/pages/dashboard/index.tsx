import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import { usePolls } from "@/hooks/use-polls";
import { useRequestVerification } from "@/hooks/use-auth-actions";
import { useAuthStore } from "@/store/use-auth-store";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { PollFilters } from "@/types";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<PollFilters["status"]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { mutate: requestVerification, isPending: isVerifying } = useRequestVerification();

  const { data, isLoading } = usePolls({ status, search: search || undefined, page, limit: 12 });
  const polls = data?.polls || [];
  const pagination = data?.pagination;

  const stats = [
    {
      label: "Total Polls",
      value: pagination?.total ?? 0,
      icon: BarChart3,
      color: "text-primary",
    },
    {
      label: "Total Responses",
      value: polls.reduce((s, p) => s + p.totalResponses, 0),
      icon: Users,
      color: "text-emerald-500",
    },
    {
      label: "Active Polls",
      value: polls.filter((p) => p.status === "active").length,
      icon: TrendingUp,
      color: "text-amber-500",
    },
    {
      label: "Drafts",
      value: polls.filter((p) => p.status === "draft").length,
      icon: Clock,
      color: "text-muted-foreground",
    },
  ];

  return (
    <DashboardView
      user={user}
      polls={polls}
      isLoading={isLoading}
      stats={stats}
      status={status}
      setStatus={setStatus}
      search={search}
      setSearch={setSearch}
      pagination={pagination}
      setPage={setPage}
      onCreatePoll={() => navigate("/polls/create")}
      requestVerification={requestVerification}
      isVerifying={isVerifying}
    />
  );
}
