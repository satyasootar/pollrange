import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FPS, SANS } from "./brand";

export type Sub = { text: string; from: number; to: number };
type Line = { text: string; dur: number };

/** Split a line into subtitle chunks (≤7 words, broken at punctuation) timed by character count. */
export const chunks = (text: string, start: number, dur: number): Sub[] => {
  // Break after punctuation that is followed by a space, so "kollects.tech" stays in one piece.
  const parts = text.split(/(?<=[.,?!:])\s+/).map((s) => s.trim()).filter(Boolean).flatMap((s) => {
    const w = s.split(" ");
    if (w.length <= 7) return [s];
    const half = Math.ceil(w.length / 2);
    return [w.slice(0, half).join(" "), w.slice(half).join(" ")];
  });
  const total = parts.reduce((a, p) => a + p.length, 0);
  let t = start;
  return parts.map((p) => {
    const d = (p.length / total) * dur;
    const c = { text: p, from: t, to: t + d };
    t += d;
    return c;
  });
};

/** Subtitles for voice lines; `startFrame(line)` says where each line begins on the timeline. */
export const subsFor = <T extends Line>(lines: T[], startFrame: (l: T) => number) =>
  lines.flatMap((l) => chunks(l.text, startFrame(l), l.dur * FPS));

export const Subtitles: React.FC<{ subs: Sub[] }> = ({ subs }) => {
  const f = useCurrentFrame();
  const cur = subs.find((s) => f >= s.from && f < s.to + 3);
  if (!cur) return null;
  const p = interpolate(f, [cur.from, cur.from + 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 46, pointerEvents: "none" }}>
      <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 700, color: "#fff", background: `${C.ink}e6`, padding: "12px 28px", borderLeft: `6px solid ${C.primary}`, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
        {cur.text}
      </div>
    </AbsoluteFill>
  );
};
