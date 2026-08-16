import { Skeleton } from "@/components/ui/skeleton";

export function PollCardSkeleton() {
  return (
    <div className="flex flex-col border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="mt-auto h-px w-full bg-border" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}
