import { motion } from "framer-motion";
import {
  Plus,
  BarChart3,
  Search,
  Filter,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PollCard } from "@/components/poll-card/poll-card";
import { PollCardSkeleton } from "@/components/poll-card/poll-card-skeleton";
import { fadeUp, stagger } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { User, Poll, PaginationMeta, PollFilters } from "@/types";

const STATUS_TABS: { label: string; value: PollFilters["status"] }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Closed", value: "closed" },
  { label: "Published", value: "published" },
];

interface Stat {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}

interface DashboardViewProps {
  user?: User | null;
  polls: Poll[];
  isLoading: boolean;
  stats: Stat[];
  status: PollFilters["status"];
  setStatus: (status: PollFilters["status"]) => void;
  search: string;
  setSearch: (search: string) => void;
  pagination?: PaginationMeta;
  setPage: (page: number | ((p: number) => number)) => void;
  onCreatePoll: () => void;
  requestVerification?: () => void;
  isVerifying?: boolean;
  hideTopBar?: boolean;
  isCompact?: boolean;
  className?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export function DashboardView({
  user,
  polls,
  isLoading,
  stats,
  status,
  setStatus,
  search,
  setSearch,
  pagination,
  setPage,
  onCreatePoll,
  requestVerification,
  isVerifying,
  hideTopBar = false,
  isCompact = false,
  className = "",
  containerRef,
}: DashboardViewProps) {
  return (
    <div className={`flex flex-1 flex-col overflow-hidden ${className}`} ref={containerRef}>
      {/* Top bar */}
      {!hideTopBar && (
        <div className={cn(
          "flex shrink-0 flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-0",
          isCompact ? "h-20 flex-row items-center py-0 px-8" : "md:h-20"
        )}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Welcome back, {user?.name?.split(" ")[0] || "User"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your polls and view analytics
            </p>
          </div>
          <Button
            onClick={onCreatePoll}
            className="w-full gap-2 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Create Poll
          </Button>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto px-4 py-6 md:px-8 custom-scrollbar", isCompact && "py-4 px-6")}>
        {/* Verification Alert */}
        {user && !user.isEmailVerified && requestVerification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("mb-6", isCompact && "mb-4")}
          >
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Email not verified</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>Please verify your email to ensure full account security and access all features.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 border-amber-500/50 bg-transparent text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                  onClick={requestVerification}
                  disabled={isVerifying}
                >
                  {isVerifying ? "Sending..." : "Resend Link"}
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Stats row */}
        <motion.div
          className={cn("mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", isCompact && "mb-4")}
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className={cn("border border-border bg-card p-4 shadow-none sm:p-5", isCompact && "p-3 sm:p-4")}
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
        <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-center", isCompact && "mb-4")}>
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
            onCreate={onCreatePoll} 
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
                <PollCard key={poll._id} poll={poll} isCompact={isCompact} />
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
              onClick={() => setPage(pagination.page - 1)}
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
              onClick={() => setPage(pagination.page + 1)}
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
