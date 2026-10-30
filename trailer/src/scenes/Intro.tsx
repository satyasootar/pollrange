import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, MONO, ease, pop } from "../brand";
import { Bg, Logo, Sfx, Slam } from "../components";

// ---------- 1. Hook (0–4s) ----------
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const second = f >= 58;
  const g = f >= 84 && f < 100 ? 1 : 0; // glitch window on "isn't."
  const jx = g * Math.sin(f * 12.9) * 14;
  return (
    <Bg dark>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 190, transform: `scale(${1 + f * 0.0007})` }}>
        {!second ? (
          <Slam size={200} words={[{ t: "Asking", at: 4 }, { t: "is", at: 16 }, { t: "easy.", at: 28, color: C.primaryLight }]} />
        ) : (
          <>
            <Slam size={190} words={[{ t: "Getting", at: 60 }, { t: "answers", at: 70 }]} />
            <div style={{ transform: `translateX(${jx}px)`, textShadow: g ? `-8px 0 ${C.red}, 8px 0 #22d3ee` : undefined }}>
              <Slam size={190} style={{ marginTop: 20 }} words={[{ t: "isn't.", at: 84, color: C.red }]} />
            </div>
          </>
        )}
      </AbsoluteFill>
      <Sfx s="impact2" at={0} v={0.7} />
      <Sfx s="negative" at={84} v={0.8} />
    </Bg>
  );
};

// ---------- 2. Problem (4–10s) ----------
const PAINS = [
  { t: "Scattered replies.", at: 6, strike: 46 },
  { t: "Manual tallies.", at: 54, strike: 94 },
  { t: "Results too late.", at: 102, strike: 140 },
];

const BUBBLES: [string, number, number, number][] = [
  // text, x, y, rotation
  ["who's coming?", 40, 40, -4], ["+1", 520, 90, 6], ["wait, which date??", 200, 190, 3], ["me!!", 600, 260, -7],
  ["can u resend the link", 20, 330, -2], ["maybe?", 470, 410, 5], ["I voted twice lol", 120, 500, -5], ["+1", 590, 560, 8],
  ["what was the question again", 30, 640, 2], ["count me in 🙋", 380, 720, -3], ["??", 660, 470, -10], ["no", 300, 820, 4],
];

const SHEET = [
  ["Name", "Coming?", "Food", "Notes"],
  ["Rahul", "yes", "veg", ""],
  ["priya", "Yes!!", "VEG", "+1"],
  ["Amit K", "y", "?", "#REF!"],
  ["rahul", "YES", "nonveg", "dup?"],
  ["Sneha", "maybe", "", "call me"],
  ["???", "no?", "#N/A", ""],
];

const Tally: React.FC<{ f: number; n: number; at: number }> = ({ f, n, at }) => (
  <svg width={720} height={260} viewBox="0 0 720 260">
    {Array.from({ length: n }, (_, i) => {
      const group = Math.floor(i / 5), k = i % 5;
      const p = ease(f, at + i * 2.2, at + i * 2.2 + 5);
      const x0 = 30 + group * 175;
      const d = k < 4 ? `M${x0 + k * 34} 40 L${x0 + k * 34 + 4} 220` : `M${x0 - 16} 190 L${x0 + 126} 70`;
      return <path key={i} d={d} stroke="#f5f5f4" strokeWidth={10} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />;
    })}
  </svg>
);

export const Problem: React.FC = () => {
  const f = useCurrentFrame();
  const seg = f < 54 ? 0 : f < 102 ? 1 : 2;
  const segIn = (s: number) => ease(f, [0, 54, 102][s]!, [0, 54, 102][s]! + 10);
  const collapse = ease(f, 156, 178);
  return (
    <Bg dark>
      <AbsoluteFill style={{ transform: `scale(${1 - collapse * 0.15})`, opacity: 1 - collapse, filter: `blur(${collapse * 12}px)` }}>
        {/* left: pain points */}
        <div style={{ position: "absolute", left: 190, top: 300 }}>
          <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.25em", color: C.red, marginBottom: 40, opacity: ease(f, 0, 10) }}>THE OLD WAY</div>
          {PAINS.map((p, i) => {
            const s = pop(f, p.at, 15);
            const strike = ease(f, p.strike, p.strike + 8);
            return (
              <div key={i} style={{ position: "relative", fontSize: 84, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.25, opacity: s * (1 - strike * 0.55), transform: `translateX(${(1 - s) * -60}px)` }}>
                {p.t}
                <div style={{ position: "absolute", left: -10, right: -10, top: "52%", height: 10, background: C.red, transform: `scaleX(${strike}) rotate(-1.5deg)`, transformOrigin: "left" }} />
              </div>
            );
          })}
        </div>

        {/* right: chaos visuals */}
        <div style={{ position: "absolute", left: 1060, top: 110, width: 760, height: 900 }}>
          {seg === 0 &&
            BUBBLES.map(([t, x, y, r], i) => {
              const p = pop(f, 8 + i * 3.4, 9);
              const jit = Math.sin(f * 0.9 + i * 2) * 3;
              return (
                <div key={i} style={{ position: "absolute", left: x, top: y, transform: `scale(${p}) rotate(${r + jit}deg)`, background: i % 3 === 0 ? "#25d366" : C.darkCard, color: i % 3 === 0 ? "#062e16" : "#f5f5f4", border: `2px solid ${C.darkBorder}`, borderRadius: 26, padding: "16px 26px", fontSize: 32, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {t}
                </div>
              );
            })}
          {seg === 1 && (
            <div style={{ marginTop: 120, opacity: segIn(1), transform: `translateY(${(1 - segIn(1)) * 60}px) rotate(-2deg)`, background: "#fff", color: "#111", border: "2px solid #999", fontFamily: MONO }}>
              <div style={{ background: "#217346", color: "#fff", padding: "12px 18px", fontSize: 22 }}>responses_FINAL_v3 (2).xlsx</div>
              {SHEET.map((row, r) => (
                <div key={r} style={{ display: "flex" }}>
                  {row.map((cell, c) => {
                    const shown = f > 58 + (r * 4 + c) * 1.3;
                    const bad = cell.startsWith("#");
                    return (
                      <div key={c} style={{ width: 186, height: 66, borderRight: "1px solid #ccc", borderBottom: "1px solid #ccc", padding: "0 14px", display: "flex", alignItems: "center", fontSize: 26, fontWeight: r === 0 ? 700 : 400, background: bad ? "#fecaca" : r === 0 ? "#eee" : "#fff", color: bad ? "#b91c1c" : "#111" }}>
                        {shown ? cell : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          {seg === 2 && (
            <div style={{ marginTop: 200, opacity: segIn(2) }}>
              <Tally f={f} n={17} at={104} />
              <div style={{ fontFamily: MONO, fontSize: 30, color: "#a8a29e", marginTop: 30 }}>
                counting… <span style={{ color: C.red }}>day {1 + Math.min(2, Math.floor(ease(f, 110, 140) * 3))}</span>
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>

      {[0, 4, 8].map((i) => <Sfx key={i} s="bubble" at={8 + i * 3.4} v={0.5} />)}
      <Sfx s="swoosh" at={54} v={0.8} />
      <Sfx s="swoosh" at={102} v={0.8} />
      <Sfx s="riser" at={103} v={0.9} />
    </Bg>
  );
};

// ---------- 3. Logo reveal (10–14s) ----------
export const LogoReveal: React.FC = () => {
  const f = useCurrentFrame();
  const slide = ease(f, 26, 44);
  const word = ease(f, 32, 50);
  return (
    <Bg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${1.04 - f * 0.0003})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40, transform: `translateY(${-60 * slide}px)` }}>
          <div style={{ transform: `translateX(${(1 - slide) * 300}px)` }}>
            <Logo size={300} delay={0} />
          </div>
          <div style={{ fontSize: 210, fontWeight: 800, letterSpacing: "-0.04em", clipPath: `inset(0 ${(1 - word) * 100}% 0 0)`, lineHeight: 1 }}>KOLLECTS</div>
        </div>
        <div style={{ position: "absolute", top: 700 }}>
          <Slam size={64} style={{ textAlign: "center" }} words={[
            { t: "Capture", at: 54 }, { t: "the", at: 58 }, { t: "Choice", at: 62, color: C.primary, italic: true },
            { t: "of", at: 68 }, { t: "your", at: 71 }, { t: "Audience.", at: 75, underline: true },
          ]} />
        </div>
      </AbsoluteFill>
      <Sfx s="impact" at={0} v={1} />
      <Sfx s="swoosh" at={28} v={0.9} />
      <Sfx s="sparkle" at={62} v={0.8} />
    </Bg>
  );
};
