import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, MONO, SANS, ease, pop } from "./brand";

// Mixkit SFX (free licence, no attribution) — gains level each file to the same loudness (~-26 dB on its loudest 300ms).
const GAIN = {
  whoosh: 0.48, swoosh: 1, click: 0.89, pop: 0.3, bubble: 0.45, correct: 0.29, positive: 0.29,
  impact: 0.17, impact2: 0.16, riser: 0.71, typing: 1, sparkle: 1, negative: 0.4,
};
type SfxName = keyof typeof GAIN;

/** One-shot sound effect at local frame `at`; `v` is relative to the levelled loudness (1 = normal). */
export const Sfx: React.FC<{ s: SfxName; at: number; v?: number }> = ({ s, at, v = 1 }) => (
  <Sequence from={Math.round(at)} durationInFrames={300} layout="none">
    <Html5Audio src={staticFile(`audio/${s}.mp3`)} volume={Math.min(1, GAIN[s] * v)} />
  </Sequence>
);

/** Page background: stone (or dark) with the app's 24px dot grid and dashed blueprint margins. */
export const Bg: React.FC<{ dark?: boolean; children?: React.ReactNode }> = ({ dark, children }) => (
  <AbsoluteFill
    style={{
      background: dark ? C.dark : C.bg,
      backgroundImage: `radial-gradient(${dark ? "rgba(255,255,255,0.07)" : "rgba(30,41,59,0.12)"} 1.4px, transparent 1.4px)`,
      backgroundSize: "24px 24px",
      fontFamily: SANS,
      color: dark ? "#f5f5f4" : C.fg,
      overflow: "hidden",
    }}
  >
    {[96, 1824].map((x) => (
      <div key={x} style={{ position: "absolute", left: x, top: 0, bottom: 0, borderLeft: `1px dashed ${dark ? C.darkBorder : C.border}` }} />
    ))}
    {children}
  </AbsoluteFill>
);

export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span
    style={{
      display: "inline-flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 20, textTransform: "uppercase",
      letterSpacing: "0.25em", color: C.primary, border: `1.5px solid ${C.primary}4d`, background: `${C.primary}0d`, padding: "8px 18px",
      ...style,
    }}
  >
    {children}
  </span>
);

/** Kollects mark rebuilt from frontend/public/logo/logo1.png: dark L + three rising bars. */
export const Logo: React.FC<{ size: number; delay?: number; ink?: string }> = ({ size, delay = 0, ink = C.ink }) => {
  const f = useCurrentFrame();
  const base = pop(f, delay, 14);
  const slope = (x: number) => 905 - 0.372 * (x - 475);
  const bars: [number, number, number][] = [[475, 634, 508], [667, 832, 320], [866, 1034, 120]];
  return (
    <svg width={size} height={size} viewBox="200 80 880 1060" style={{ overflow: "visible" }}>
      <path d="M248 186 H460 V895 L488 938 L1034 735 V1094 H248 Z" fill={ink}
        style={{ transform: `scale(${base})`, transformOrigin: "248px 1094px" }} />
      {bars.map(([x0, x1, top], i) => {
        const p = pop(f, delay + 7 + i * 5, 10);
        const bl = slope(x0), br = slope(x1);
        const t = bl - (bl - top) * p;
        return <polygon key={i} fill={C.logoBar} points={`${x0},${t} ${x1},${t - (bl - br)} ${x1},${br} ${x0},${bl}`} opacity={p > 0.01 ? 1 : 0} />;
      })}
    </svg>
  );
};

/** Indigo + ink skewed panels that fully cover the frame at local frame 10. Use in a 20-frame Sequence. */
export const Wipe: React.FC = () => {
  const f = useCurrentFrame();
  const panel = (d: number, color: string) => {
    const x = f < 10 + d ? ease(f, d, 10 + d, [-140, 0]) : ease(f, 10 + d, 20 + d, [0, 140]);
    return <div style={{ position: "absolute", inset: "-10% -30%", background: color, transform: `translateX(${x}%) skewX(-14deg)` }} />;
  };
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{panel(-2, C.primary)}{panel(0, C.ink)}</AbsoluteFill>;
};

/** Fake browser window in the app's industrial style (sharp corners, hard offset shadow). */
export const Browser: React.FC<{ url: string; w: number; h: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ url, w, h, style, children }) => (
  <div style={{ width: w, height: h, background: C.card, border: `2px solid ${C.fg}`, boxShadow: `14px 14px 0 ${C.fg}`, display: "flex", flexDirection: "column", ...style }}>
    <div style={{ height: 52, borderBottom: `2px solid ${C.fg}`, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", flexShrink: 0 }}>
      {[C.red, "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 14, height: 14, background: c, border: `1.5px solid ${C.fg}` }} />)}
      <div style={{ marginLeft: 18, flex: 1, height: 30, border: `1.5px solid ${C.border}`, background: "#fff", fontFamily: MONO, fontSize: 16, color: C.muted, display: "flex", alignItems: "center", padding: "0 14px" }}>
        {url}
      </div>
    </div>
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
  </div>
);

export const Phone: React.FC<{ w?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ w = 380, style, children }) => (
  <div style={{ width: w, height: w * 2.05, background: "#111", borderRadius: 54, padding: 14, boxShadow: "0 40px 80px rgba(0,0,0,0.35)", ...style }}>
    <div style={{ width: "100%", height: "100%", background: C.card, borderRadius: 42, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 12, left: "50%", width: 110, height: 30, background: "#111", borderRadius: 20, transform: "translateX(-50%)", zIndex: 5 }} />
      {children}
    </div>
  </div>
);

export const Cursor: React.FC<{ x: number; y: number; pressed?: number }> = ({ x, y, pressed = 0 }) => (
  <svg width={44} height={44} viewBox="0 0 24 24" style={{ position: "absolute", left: x, top: y, transform: `scale(${1 - pressed * 0.18})`, transformOrigin: "4px 3px", zIndex: 50, filter: "drop-shadow(2px 3px 2px rgba(0,0,0,0.3))" }}>
    <path d="M4 3 L19 12 L12 13.5 L9 20 Z" fill={C.fg} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
  </svg>
);

/** Big uppercase headline whose words slam in one by one at the given frames. */
export const Slam: React.FC<{ words: { t: string; at: number; color?: string; italic?: boolean; underline?: boolean }[]; size: number; style?: React.CSSProperties }> = ({ words, size, style }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontSize: size, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.9, ...style }}>
      {words.map((w, i) => {
        const p = pop(f, w.at, 12);
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.22em", position: "relative", color: w.color, fontStyle: w.italic ? "italic" : undefined, opacity: Math.min(1, p * 3), transform: `scale(${1.5 - 0.5 * p}) translateY(${(1 - p) * -20}px)`, filter: `blur(${Math.max(0, (1 - p) * 10)}px)` }}>
            {w.t}
            {w.underline && <span style={{ position: "absolute", left: 0, right: 0, bottom: -size * 0.08, height: size * 0.05, background: C.primary, transform: `scaleX(${ease(f, w.at + 12, w.at + 30)})`, transformOrigin: "left" }} />}
          </span>
        );
      })}
    </div>
  );
};

/** "01 / Build It" header with the giant faded step number, like StepCard on the landing page. */
export const StepHeader: React.FC<{ num: string; title: string; dark?: boolean }> = ({ num, title, dark }) => {
  const f = useCurrentFrame();
  const p = pop(f, 2, 16);
  return (
    <div style={{ position: "relative", transform: `translateY(${(1 - p) * 40}px)`, opacity: p }}>
      <div style={{ position: "absolute", top: -60, left: 400, fontFamily: MONO, fontWeight: 700, fontSize: 260, color: dark ? "#ffffff0d" : `${C.fg}0f`, lineHeight: 1 }}>{num}</div>
      <Label>Step {num}</Label>
      <div style={{ marginTop: 22, fontSize: 92, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.92 }}>{title}</div>
    </div>
  );
};

/** Caption line that swaps text with a slide; `items` = [startFrame, text][]. */
export const Caption: React.FC<{ items: [number, string][]; style?: React.CSSProperties }> = ({ items, style }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "relative", height: 90, ...style }}>
      {items.map(([at, text], i) => {
        const next = items[i + 1]?.[0] ?? Infinity;
        const inP = ease(f, at, at + 14);
        const outP = next === Infinity ? 0 : ease(f, next - 8, next);
        if (f < at || f > next) return null;
        return (
          <div key={i} style={{ position: "absolute", fontSize: 40, fontWeight: 500, color: C.muted, opacity: inP * (1 - outP), transform: `translateY(${(1 - inP) * 30 - outP * 30}px)` }}>
            {text}
          </div>
        );
      })}
    </div>
  );
};
