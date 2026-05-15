import { motion } from "framer-motion";
import { skeletonVariants } from "@/lib/animations";

export function PollCardSkeleton() {
  return (
    <motion.div
      className="flex flex-col border border-border bg-card p-5 space-y-3"
      variants={skeletonVariants}
      animate="pulse"
    >
      <div className="h-4 w-16 rounded bg-muted" />
      <div className="h-5 w-3/4 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="mt-auto h-px w-full bg-border" />
      <div className="flex justify-between">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-6 w-20 rounded bg-muted" />
      </div>
    </motion.div>
  );
}
