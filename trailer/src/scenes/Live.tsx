import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO, ease, pop } from "../brand";
import { Bg, Browser, Label, Sfx } from "../components";

const START = 24;
const END = 220;
const TOTAL = 1284;
const OPTIONS = ["Live quizzes", "Dark mode", "Mobile app", "Integrations"];
const SHARE = [0.44, 0.28, 0.18, 0.1];
const WORDS: [string, number][] = [
  ["fast", 64], ["simple", 50], ["live", 56], ["beautiful", 36], ["easy", 44], ["QR codes", 30], ["quizzes", 38],
  ["clean", 28], ["instant", 42], ["love it", 30], ["smooth", 26], ["free", 34], ["branding", 24], ["fun", 30],
];

// Vote times accelerate: 1 every 8 frames → 1 every 2.
const VOTES: number[] = [];
for (let t = START, dt = 8; t < END; t += dt, dt = Math.max(2, dt * 0.9)) VOTES.push(Math.round(t));

const totalAt = (f: number) => Math.round(TOTAL * Math.pow(interpolate(f, [START, END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 1.5));

const Card: React.FC<{ label: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ label, children, style }) => (
  <div style={{ border: `2px solid ${C.border}`, background: "#fff", padding: "20px 24px", ...style }}>
    <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: "0.2em", color: C.muted, textTransform: "uppercase" }}>{label}</div>
    {children}
  </div>
);

export const Live: React.FC = () => {
  const f = useCurrentFrame();
  const total = totalAt(f);
  const lastVote = [...VOTES].reverse().find((v) => v <= f) ?? -99;
  const pulse = f < END ? 1 + 0.1 * Math.max(0, 1 - (f - lastVote) / 5) : 1;
  const prog = interpolate(f, [START, END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Shares wobble early, settle as votes pile up.
  const raw = SHARE.map((s, i) => Math.max(0.02, s + 0.14 * Math.sin(f * 0.09 + i * 1.9) * (1 - prog)));
  const sum = raw.reduce((a, b) => a + b, 0);
  const shares = raw.map((r) => r / sum);
  const leader = shares.indexOf(Math.max(...shares));

  const enter = pop(f, 0, 16);
  const head = pop(f, 2, 16);

  // timeline path
  const pts = Array.from({ length: 25 }, (_, i) => {
    const y = 0.15 + 0.7 * Math.pow(i / 24, 1.4) + 0.08 * Math.sin(i * 1.3);
    return [i * (560 / 24), 190 - y * 170] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const draw = ease(f, START, END + 20);

  const toasts = [30, 70, 110, 150, 190];

  return (
    <Bg>
      <div style={{ position: "absolute", left: 190, top: 80, display: "flex", alignItems: "center", gap: 30, opacity: head, transform: `translateY(${(1 - head) * -30}px)` }}>
        <Label>Step 03</Label>
        <div style={{ fontSize: 80, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.03em" }}>Watch it live.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.fg, color: "#fff", padding: "10px 20px", fontFamily: MONO, fontSize: 22, letterSpacing: "0.2em" }}>
          <div style={{ width: 16, height: 16, borderRadius: 99, background: C.red, opacity: 0.5 + 0.5 * Math.abs(Math.sin(f * 0.15)) }} /> LIVE
        </div>
      </div>

      <div style={{ position: "absolute", left: 190, top: 230, transform: `translateY(${(1 - enter) * 300}px) scale(${0.98 + f * 0.00012})`, transformOrigin: "50% 0" }}>
        <Browser url="kollects.tech/polls/roadmap/analytics" w={1540} h={790}>
          <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
            {/* overview cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              <Card label="Total responses" style={{ borderColor: pulse > 1.02 ? C.primary : C.border }}>
                <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: "-0.03em", transform: `scale(${pulse})`, transformOrigin: "left", color: pulse > 1.02 ? C.primary : C.fg }}>{total.toLocaleString("en-US")}</div>
              </Card>
              <Card label="Completion rate"><div style={{ fontSize: 60, fontWeight: 800 }}>{Math.round(interpolate(f, [START, END], [100, 94], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}%</div></Card>
              <Card label="Anonymous"><div style={{ fontSize: 60, fontWeight: 800 }}>{Math.round(total * 0.63).toLocaleString("en-US")}</div></Card>
              <Card label="Signed in"><div style={{ fontSize: 60, fontWeight: 800 }}>{(total - Math.round(total * 0.63)).toLocaleString("en-US")}</div></Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 620px", gap: 20, flex: 1 }}>
              {/* question chart */}
              <Card label="Q1 · What should we build next?">
                <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 30 }}>
                  {OPTIONS.map((o, i) => {
                    const pct = shares[i]! * 100;
                    return (
                      <div key={o}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 700, marginBottom: 10 }}>
                          <span>{o}{i === leader && f > START ? <span style={{ marginLeft: 14, fontFamily: MONO, fontSize: 16, color: C.primary, letterSpacing: "0.15em" }}>▲ LEADING</span> : null}</span>
                          <span style={{ fontFamily: MONO }}>{Math.round(total * shares[i]!)} · {f > START ? pct.toFixed(0) : 0}%</span>
                        </div>
                        <div style={{ height: 44, background: C.card, border: `1.5px solid ${C.border}` }}>
                          <div style={{ height: "100%", width: `${f > START ? pct / 0.5 : 0}%`, maxWidth: "100%", background: i === leader ? C.primary : C.ramp[Math.min(4, i + 1)], opacity: i === leader ? 1 : 0.55 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Card label="Responses over time" style={{ height: 270 }}>
                  <div style={{ position: "absolute", marginTop: -26, marginLeft: 330, display: "flex", fontFamily: MONO, fontSize: 13 }}>
                    {["MIN", "HOUR", "DAY", "WEEK"].map((g) => <span key={g} style={{ padding: "4px 8px", background: g === "MIN" ? C.fg : "transparent", color: g === "MIN" ? "#fff" : C.muted }}>{g}</span>)}
                  </div>
                  <svg width={560} height={200} style={{ marginTop: 10 }}>
                    <defs>
                      <clipPath id="tl"><rect x={0} y={0} width={560 * draw} height={200} /></clipPath>
                      <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.primary} stopOpacity={0.35} /><stop offset="1" stopColor={C.primary} stopOpacity={0} /></linearGradient>
                    </defs>
                    <g clipPath="url(#tl)">
                      <path d={`${line} L560 200 L0 200 Z`} fill="url(#fill)" />
                      <path d={line} stroke={C.primary} strokeWidth={4} fill="none" />
                    </g>
                    {draw > 0 && draw < 1 && <circle cx={560 * draw} cy={pts[Math.min(24, Math.round(draw * 24))]![1]} r={8} fill={C.primary} stroke="#fff" strokeWidth={3} />}
                  </svg>
                </Card>
                <Card label="Word cloud · what people said" style={{ flex: 1 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "4px 18px", marginTop: 14 }}>
                    {WORDS.map(([w, s], i) => {
                      const p = pop(f, 120 + i * 6, 11);
                      return <span key={w} style={{ fontSize: s * 0.82, fontWeight: 800, color: C.ramp[i % 5], transform: `scale(${p})`, display: "inline-block", lineHeight: 1.1 }}>{w}</span>;
                    })}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Browser>
      </div>

      {/* sonner-style toasts */}
      {toasts.map((t, i) => {
        const p = ease(f, t, t + 10) * (1 - ease(f, t + 34, t + 44));
        if (p <= 0) return null;
        return (
          <div key={t} style={{ position: "absolute", right: 110, top: 100, background: C.fg, color: "#fff", padding: "18px 26px", fontSize: 22, fontWeight: 600, display: "flex", gap: 14, alignItems: "center", opacity: p, transform: `translateX(${(1 - p) * 120}px)`, boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ width: 12, height: 12, background: C.primaryLight }} /> New response · {["just now", "Mobile · Chrome", "Anonymous", "just now", "Desktop · Safari"][i]}
          </div>
        );
      })}

      <Sfx s="swoosh" at={0} v={0.8} />
      {toasts.map((t) => <Sfx key={t} s="bubble" at={t} v={0.5} />)}
      <Sfx s="positive" at={END} v={0.8} />
    </Bg>
  );
};
