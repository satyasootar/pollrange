import { motion } from "framer-motion";
import { useResponseHistory } from "@/hooks/use-responses";
import { formatDate, timeAgo } from "@/lib/utils";
import { ExternalLink, BarChart3, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function HistoryPage() {
  const { data: history, isLoading } = useResponseHistory();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Poll History</h2>
          <p className="text-muted-foreground">
            A record of all the polls you have participated in.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-none" />
          ))}
        </div>
      ) : !history || history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border bg-muted/30">
          <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium">No participation history</h3>
          <p className="text-muted-foreground">You haven't answered any polls yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {history.map((item) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
            >
              <div className="mb-3 flex items-start justify-between">
                 <Badge variant="outline" className={
                   item.pollId.status === 'published' 
                   ? "border-primary/40 bg-primary/10 text-primary rounded-none font-normal"
                   : "text-muted-foreground rounded-none font-normal"
                 }>
                   {item.pollId.status === 'published' ? 'Results Published' : 'Completed'}
                 </Badge>
                 <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                   {timeAgo(item.submittedAt)}
                 </span>
              </div>
              
              <h3 className="line-clamp-2 font-semibold mb-4 flex-1 group-hover:text-primary transition-colors">
                {item.pollId.title}
              </h3>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 h-8 text-xs gap-1.5 rounded-none"
                  onClick={() => window.open(`/p/${item.pollId.shareToken}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Poll
                </Button>
                {item.pollId.status === 'published' && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1 h-8 text-xs gap-1.5 rounded-none"
                    onClick={() => window.open(`/p/${item.pollId.shareToken}/results`, '_blank')}
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
  );
}

export default HistoryPage;
