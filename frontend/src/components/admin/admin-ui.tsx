import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("border border-border bg-card", className)}>
      <header className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Label/value row used in the system panels. */
export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium tabular-nums">{children}</span>
    </div>
  );
}

/** Thin horizontal meter; tone flips to amber/red past 70%/90%. */
export function Meter({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const tone = pct > 90 ? "bg-destructive" : pct > 70 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="space-y-1">
      {label && <p className="flex justify-between text-xs text-muted-foreground"><span>{label}</span><span className="tabular-nums">{pct.toFixed(0)}%</span></p>}
      <div className="h-1.5 w-full bg-muted" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cn("h-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatusDot({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", ok ? "bg-emerald-500" : "bg-destructive")} aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "good" | "warn" | "bad" | "primary" }) {
  const tones = {
    muted: "border-border text-muted-foreground",
    good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-600",
    bad: "border-destructive/40 bg-destructive/10 text-destructive",
    primary: "border-primary/40 bg-primary/10 text-primary",
  };
  return <span className={cn("inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tones[tone])}>{children}</span>;
}

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-popover/90 p-2 shadow-xl backdrop-blur-md">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-block h-2 w-2" style={{ background: p.color }} />
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
}
