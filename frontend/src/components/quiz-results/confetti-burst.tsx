import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const COLORS = ["#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#facc15"];

// Generated once per page load: render stays pure and every burst shares the shape set.
const PIECES = Array.from({ length: 36 }, (_, i) => ({
  angle: (i / 36) * Math.PI * 2 + Math.random() * 0.4,
  distance: 50 + Math.random() * 90,
  lift: 40 + Math.random() * 70,
  spin: (Math.random() - 0.5) * 900,
  size: 5 + Math.random() * 5,
  delay: Math.random() * 0.2,
  duration: 1.6 + Math.random() * 0.9,
  round: i % 3 === 0,
  color: COLORS[i % COLORS.length]!,
}));

/**
 * A one-shot confetti pop centred on its (relatively positioned) parent. Remount it
 * (change its `key`) to fire again. Renders nothing for reduced-motion users.
 */
export function ConfettiBurst({ scale = 1, delay = 0, className }: { scale?: number; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 z-10 overflow-visible", className)}>
      {PIECES.map((p, i) => {
        const x = Math.cos(p.angle) * p.distance * scale;
        const y = Math.sin(p.angle) * p.distance * 0.6 * scale - p.lift * scale;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/3"
            style={{
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              backgroundColor: p.color,
              borderRadius: p.round ? 9999 : 1,
            }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
            animate={{ x: [0, x, x * 1.15], y: [0, y, y + 160 * scale], opacity: [1, 1, 0], rotate: p.spin, scale: 1 }}
            transition={{ duration: p.duration, delay: delay + p.delay, ease: "easeOut", times: [0, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}
