import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  BarChart3,
  Clock,
  Users,
  TrendingUp,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePolls } from "@/hooks/use-polls";
import { useAuthStore } from "@/store/use-auth-store";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { PollCard } from "@/components/poll-card/poll-card";
import { PollCardSkeleton } from "@/components/poll-card/poll-card-skeleton";
import { fadeUp, stagger } from "@/lib/animations";
import type { PollStatus, PollFilters } from "@/types";

const STATUS_TABS: { label: string; value: PollFilters["status"] }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Closed", value: "closed" },
  { label: "Published", value: "published" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<PollFilters["status"]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your polls and view analytics
          </p>
        </div>
        <Button
          onClick={() => navigate("/polls/create")}
          className="w-full gap-2 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create Poll
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {/* Stats row */}
        <motion.div
          className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="border border-border bg-card p-4 shadow-none sm:p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                  {stat.label}
                </span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl">
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search polls…"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1 pb-1 scrollbar-none sm:pb-0">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-none border px-3 py-1.5 text-[10px] font-medium transition-colors sm:text-xs ${
                  status === tab.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Poll grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PollCardSkeleton key={i} />
            ))}
          </div>
        ) : polls.length === 0 ? (
          <EmptyState 
            isFiltered={status !== "all" || search !== ""} 
            onCreate={() => navigate("/polls/create")} 
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {polls.map((poll) => (
              <motion.div key={poll._id} variants={fadeUp}>
                <PollCard poll={poll} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ 
  isFiltered, 
  onCreate 
}: { 
  isFiltered: boolean; 
  onCreate: () => void; 
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-24 text-center"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center border border-dashed border-border">
        {isFiltered ? (
          <Filter className="h-7 w-7 text-muted-foreground" />
        ) : (
          <BarChart3 className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <h3 className="mb-2 text-lg font-semibold">
        {isFiltered ? "No matches found" : "No polls yet"}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        {isFiltered 
          ? "Try adjusting your search or filters to find what you're looking for." 
          : "Create your first poll to start collecting responses and insights."}
      </p>
      <Button onClick={onCreate} className="gap-2">
        <Plus className="h-4 w-4" />
        {isFiltered ? "Create New Poll" : "Create your first poll"}
      </Button>
    </motion.div>
  );
}
