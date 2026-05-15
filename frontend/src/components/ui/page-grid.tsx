/**
 * PageGrid — Global decorative grid overlay
 * 
 * Renders horizontal dashed lines that cross the vertical margin lines
 * to create the "blueprint grid" editorial aesthetic.
 * 
 * Usage: Mount once in a layout wrapper (e.g. App.tsx or a global layout).
 * The vertical lines are handled globally via body::before/after in index.css.
 */
import React from "react";

interface HorizontalLine {
  /** CSS top value, e.g. "80px" or "var(--nav-height)" */
  top: string;
  opacity?: number;
}

interface PageGridProps {
  /** Custom horizontal line positions. Defaults to a standard set. */
  lines?: HorizontalLine[];
}

const DEFAULT_LINES: HorizontalLine[] = [
  { top: "80px", opacity: 0.12 },      // Below nav
  { top: "520px", opacity: 0.08 },     // Mid hero
  { top: "900px", opacity: 0.12 },     // Hero → features
  { top: "1400px", opacity: 0.08 },    // Features → workflow
  { top: "1900px", opacity: 0.12 },    // Workflow → stats
];

export function PageGrid({ lines = DEFAULT_LINES }: PageGridProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 pointer-events-none"
      style={{ zIndex: 99998 }}
    >
      {/* Horizontal crossing lines */}
      {lines.map((line, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 h-px"
          style={{
            top: line.top,
            background: `repeating-linear-gradient(
              to right,
              rgba(30, 41, 59, ${line.opacity ?? 0.1}) 0px,
              rgba(30, 41, 59, ${line.opacity ?? 0.1}) 4px,
              transparent 4px,
              transparent 12px
            )`,
          }}
        />
      ))}

      {/* Intersection dot markers — small squares where lines cross */}
      {lines.map((line, i) => (
        <React.Fragment key={`markers-${i}`}>
          {/* Left margin intersection */}
          <div
            className="absolute w-[5px] h-[5px] -translate-x-[2px] -translate-y-[2px]"
            style={{
              top: line.top,
              left: "max(24px, calc(50% - 700px + 24px))",
              background: `rgba(30, 41, 59, ${(line.opacity ?? 0.1) * 2})`,
            }}
          />
          {/* Right margin intersection */}
          <div
            className="absolute w-[5px] h-[5px] -translate-x-[2px] -translate-y-[2px]"
            style={{
              top: line.top,
              left: "min(calc(100% - 24px), calc(50% + 700px - 24px))",
              background: `rgba(30, 41, 59, ${(line.opacity ?? 0.1) * 2})`,
            }}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
