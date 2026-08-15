import { motion } from "framer-motion"
import { useResponseHistory } from "@/hooks/use-responses"
import { timeAgo } from "@/lib/utils"
import { ExternalLink, BarChart3, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function HistoryPage() {
  const { data: history, isLoading } = useResponseHistory()

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 flex-col gap-4 border-b border-border px-4 py-4 md:h-20 md:flex-row md:items-center md:justify-between md:px-8 md:py-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Poll History</h1>
          <p className="text-sm text-muted-foreground">
            A record of all the polls you have participated in.
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto p-4 md:p-8">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-none" />
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-border bg-muted/30 py-20 text-center">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-medium">No participation history</h3>
            <p className="text-muted-foreground">
              You haven't answered any polls yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {history.map((item) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="mb-3 flex items-start justify-between">
                  <Badge
                    variant="outline"
                    className={
                      item.pollId.status === "published"
                        ? "rounded-none border-primary/40 bg-primary/10 font-normal text-primary"
                        : "rounded-none font-normal text-muted-foreground"
                    }
                  >
                    {item.pollId.status === "published"
                      ? "Results Published"
                      : "Completed"}
                  </Badge>
                  <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
                    {timeAgo(item.submittedAt)}
                  </span>
                </div>

                <h3 className="mb-4 line-clamp-2 flex-1 font-semibold transition-colors group-hover:text-primary">
                  {item.pollId.title}
                </h3>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 gap-1.5 rounded-none text-xs"
                    onClick={() =>
                      window.open(`/p/${item.pollId.shareToken}`, "_blank")
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Poll
                  </Button>
                  {item.pollId.status === "published" && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 flex-1 gap-1.5 rounded-none text-xs"
                      onClick={() =>
                        window.open(
                          `/p/${item.pollId.shareToken}/results`,
                          "_blank"
                        )
                      }
                    >
                      <BarChart3 className="h-3 w-3" />
                      Results
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoryPage
