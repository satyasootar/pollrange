import { motion } from "framer-motion";
import { skeletonVariants } from "@/lib/animations";

function Skel({ className }: { className?: string }) {
  return (
    <motion.div
      className={`rounded bg-muted ${className}`}
      variants={skeletonVariants}
      animate="pulse"
    />
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border px-8 py-4">
        <Skel className="h-8 w-8" />
        <Skel className="h-6 w-48" />
      </div>
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skel key={i} className="h-28" />)}
        </div>
        <Skel className="h-56" />
        <Skel className="h-56" />
        <Skel className="h-56" />
      </div>
    </div>
  );
}
