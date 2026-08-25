import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, FileText, Users, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForms } from "@/hooks/use-forms";
import { FormCard } from "@/components/forms/form-card";
import { PollCardSkeleton } from "@/components/poll-card/poll-card-skeleton";
import { StatsRow } from "@/components/dashboard/stats-row";
import type { Stat } from "@/components/dashboard/stat-tile";
import type { FormFilters } from "@/types";

const STATUS_TABS: { label: string; value: NonNullable<FormFilters["status"]> }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Closed", value: "closed" },
  { label: "Published", value: "published" },
];

export function FormsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<FormFilters["status"]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useForms({ status, search: search || undefined, page, limit: 12 });
  const forms = data?.forms ?? [];
  const pagination = data?.pagination;

  // Labels/icons/colors intentionally mirror the Polls dashboard's stat tiles
  // (same "Total Responses" / "Drafts" tiles) so only the differing tiles
  // (Total/Active, which use a different label+icon per entity) actually change.
  const stats: Stat[] = [
    { label: "Total Forms", value: pagination?.total ?? 0, icon: FileText, color: "text-primary" },
    { label: "Total Responses", value: forms.reduce((s, f) => s + f.totalResponses, 0), icon: Users, color: "text-emerald-500" },
    { label: "Active Forms", value: forms.filter((f) => f.status === "active").length, icon: TrendingUp, color: "text-amber-500" },
    { label: "Drafts", value: forms.filter((f) => f.status === "draft").length, icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-4 md:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">Forms</h1>
          <p className="truncate text-sm text-muted-foreground">Build forms and quizzes</p>
        </div>
        <Button onClick={() => navigate("/forms/create")} className="hidden shrink-0 gap-2 sm:inline-flex">
          <Plus className="h-4 w-4" /> Create Form
        </Button>
      </div>

      {/* Mobile create form shortcut */}
      <Button
        onClick={() => navigate("/forms/create")}
        aria-label="Create form"
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-none p-0 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <StatsRow stats={stats} className="mb-8" />

        <div className="mb-6 flex items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search forms…"
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
                aria-label="Filter forms by status"
                className="relative size-12 border-border shadow-none hover:shadow-none focus-visible:border-primary"
              >
                <Filter className="h-4 w-4" />
                {status !== "all" && <span className="absolute right-1 top-1 h-1.5 w-1.5 bg-primary" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={status}
                onValueChange={(value) => {
                  setStatus(value as FormFilters["status"]);
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

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PollCardSkeleton key={i} />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center border border-dashed border-border">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              {status !== "all" || search ? "No matches found" : "No forms yet"}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              {status !== "all" || search
                ? "Try adjusting your search or filters."
                : "Create your first form to start collecting responses."}
            </p>
            <Button onClick={() => navigate("/forms/create")} className="gap-2">
              <Plus className="h-4 w-4" /> Create your first form
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <FormCard key={form._id} form={form} />
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(pagination.page - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(pagination.page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
