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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PollCard } from "@/components/poll-card/poll-card";
import { PollCardSkeleton } from "@/components/poll-card/poll-card-skeleton";
import { StatsRow } from "@/components/dashboard/stats-row";
import type { Stat } from "@/components/dashboard/stat-tile";
import { cn } from "@/lib/utils";
import type { User, Poll, PaginationMeta, PollFilters, PollStatus } from "@/types";

const STATUS_TABS: { label: string; value: PollStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Closed", value: "closed" },
  { label: "Published", value: "published" },
];

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
  onPollClick?: (pollId: string) => void;
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
  onPollClick,
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
            className={cn("w-full gap-2 sm:w-auto", !isCompact && "hidden sm:inline-flex")}
          >
            <Plus className="h-4 w-4" />
            Create Poll
          </Button>
        </div>
      )}

      {/* Mobile create poll shortcut */}
      {!isCompact && (
        <Button
          onClick={onCreatePoll}
          aria-label="Create poll"
          className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-none p-0 md:hidden"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <div className={cn("flex-1 overflow-y-auto px-4 py-6 md:px-8 custom-scrollbar", isCompact && "py-4 px-6")}>
        {/* Verification Alert */}
        {user && !user.isEmailVerified && requestVerification && (
          <div className={cn("mb-6", isCompact && "mb-4")}>
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
          </div>
        )}

        {/* Stats row */}
        <StatsRow stats={stats} isCompact={isCompact} className={cn("mb-8", isCompact && "mb-4")} />

        {/* Filters */}
        <div className={cn("mb-6 flex items-center justify-between", isCompact && "mb-4")}>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Filter polls by status"
                className="relative border-border shadow-none hover:shadow-none focus-visible:border-primary"
              >
                <Filter className="h-4 w-4" />
                {status !== "all" && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={status}
                onValueChange={(value) => {
                  setStatus(value as PollFilters["status"]);
                  setPage(1);
                }}
              >
                {STATUS_TABS.map((tab) => (
                  <DropdownMenuRadioItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {polls.map((poll) => (
              <PollCard
                key={poll._id}
                poll={poll}
                isCompact={isCompact}
                onSelect={onPollClick}
              />
            ))}
          </div>
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
    <div className="flex flex-col items-center justify-center py-24 text-center">
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
    </div>
  );
}
