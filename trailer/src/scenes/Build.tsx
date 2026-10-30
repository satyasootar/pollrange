import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AlignLeft, Calendar, CheckSquare, ChevronDownSquare, CircleDot, Clock, Grid3x3, LayoutGrid, SlidersHorizontal, Sparkles, Star, Type, Upload } from "lucide-react";
import { C, MONO, SANS, SERIF, ease, pop } from "../brand";
import { Bg, Browser, Caption, Cursor, Label, Sfx, StepHeader } from "../components";

// Same labels/icons as frontend/src/components/form-builder/question-types.ts
const TYPES: [string, React.ElementType][] = [
  ["Short answer", Type], ["Paragraph", AlignLeft], ["Single choice", CircleDot], ["Checkboxes", CheckSquare],
  ["Dropdown", ChevronDownSquare], ["Linear scale", SlidersHorizontal], ["Rating", Star], ["Date", Calendar],
  ["Time", Clock], ["Choice grid", Grid3x3], ["Checkbox grid", LayoutGrid], ["File upload", Upload],
];

const PROMPT = "Make a feedback form for my workshop";
const TYPE_START = 12;
const SEND = 60;

const QCard: React.FC<{ kind: string; title: string; at: number; children: React.ReactNode }> = ({ kind, title, at, children }) => {
  const f = useCurrentFrame();
  const p = pop(f, at, 14);
  return (
    <div style={{ border: `2px solid ${C.border}`, background: "#fff", padding: "18px 22px", marginBottom: 14, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
      <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: "0.2em", color: C.primary }}>{kind}</div>
      <div style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 12px" }}>{title}</div>
      {children}
    </div>
  );
};

const AiPanel: React.FC = () => {
  const f = useCurrentFrame();
  const typed = PROMPT.slice(0, Math.floor(interpolate(f, [TYPE_START, SEND - 6], [0, PROMPT.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const sent = f >= SEND;
  const userP = pop(f, SEND, 14);
  const think = f >= SEND + 4 && f < SEND + 12;
  return (
    <Browser url="kollects.tech/dashboard/chat" w={880} h={790}>
      <div style={{ padding: 28, height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 800, textTransform: "uppercase" }}>
          <Sparkles size={26} color={C.primary} /> Create with AI
        </div>
        <div style={{ flex: 1, paddingTop: 22 }}>
          {sent && (
            <div style={{ marginLeft: "auto", width: "fit-content", background: C.primary, color: "#fff", padding: "14px 20px", fontSize: 24, fontWeight: 600, opacity: userP, transform: `scale(${0.8 + userP * 0.2})`, transformOrigin: "right" }}>
              {PROMPT}
            </div>
          )}
          {think && <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 20, color: C.muted }}>thinking{".".repeat(1 + (Math.floor(f / 3) % 3))}</div>}
          {f >= SEND + 12 && (
            <div style={{ marginTop: 18 }}>
              <QCard kind="RATING" title="How would you rate the session?" at={SEND + 12}>
                <div style={{ display: "flex", gap: 8 }}>{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={30} color={C.primary} fill={i < 4 ? C.primary : "none"} />)}</div>
              </QCard>
              <QCard kind="PARAGRAPH" title="What did you like most?" at={SEND + 19}>
                <div style={{ height: 14, background: C.border, width: "80%" }} />
              </QCard>
              <QCard kind="SINGLE CHOICE" title="Would you attend again?" at={SEND + 26}>
                <div style={{ display: "flex", gap: 26, fontSize: 21 }}>
                  {["Yes", "Maybe", "No"].map((o) => <span key={o} style={{ display: "flex", alignItems: "center", gap: 8 }}><CircleDot size={20} color={C.muted} />{o}</span>)}
                </div>
              </QCard>
            </div>
          )}
        </div>
        <div style={{ border: `2px solid ${sent ? C.border : C.primary}`, background: "#fff", padding: "16px 20px", fontSize: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: sent ? C.muted : C.fg }}>
            {sent ? "Ask AI to create a poll or form…" : typed}
            {!sent && <span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1, color: C.primary }}>|</span>}
          </span>
          <span style={{ background: C.fg, color: "#fff", fontWeight: 800, fontSize: 18, padding: "8px 16px", letterSpacing: "0.1em" }}>SEND</span>
        </div>
      </div>
    </Browser>
  );
};

const TypeGrid: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 280px)", gap: 18 }}>
      {TYPES.map(([label, Icon], i) => {
        const at = 116 + i * 4;
        const p = pop(f, at, 12);
        const hl = ease(f, 160 + i * 2, 166 + i * 2) * (1 - ease(f, 170 + i * 2, 178 + i * 2));
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 20px", background: hl > 0.5 ? C.primary : "#fff", color: hl > 0.5 ? "#fff" : C.fg, border: `2px solid ${C.fg}`, boxShadow: `6px 6px 0 ${C.fg}`, fontSize: 24, fontWeight: 700, opacity: p, transform: `translateY(${(1 - p) * 120}px) rotate(${(1 - p) * (i % 2 ? 8 : -8)}deg)` }}>
            <div style={{ width: 46, height: 46, border: `2px solid ${hl > 0.5 ? "#fff" : C.primary}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={24} color={hl > 0.5 ? "#fff" : C.primary} />
            </div>
            {label}
          </div>
        );
      })}
    </div>
  );
};

// Brand kit: each click swaps accent colour, corner style and heading font (all real brand-kit options).
const KITS = [
  { at: 0, color: C.primary, radius: 0, font: SANS, name: "Sharp · Jakarta" },
  { at: 214, color: "#059669", radius: 28, font: SERIF, name: "Round · Lora" },
  { at: 238, color: "#ea580c", radius: 12, font: SANS, name: "Soft · Jakarta" },
];
const SWATCH_Y = 150;
const swatchX = (i: number) => 60 + i * 96;

const BrandKit: React.FC = () => {
  const f = useCurrentFrame();
  const k = [...KITS].reverse().find((x) => f >= x.at)!;
  const cx = interpolate(f, [192, 208, 214, 230, 238, 270], [700, swatchX(1) + 20, swatchX(1) + 20, swatchX(2) + 20, swatchX(2) + 20, 760], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = interpolate(f, [192, 208, 238, 270], [700, SWATCH_Y + 22, SWATCH_Y + 22, 640], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const press = KITS.slice(1).reduce((a, x) => a + Math.max(0, 1 - Math.abs(f - x.at) / 4), 0);
  const flash = KITS.slice(1).reduce((a, x) => a + (f >= x.at ? 1 - ease(f, x.at, x.at + 12) : 0), 0);
  return (
    <div style={{ position: "relative", width: 900, height: 800 }}>
      <Label>Brand kit</Label>
      <div style={{ display: "flex", gap: 16, marginTop: 30, marginLeft: 40 }}>
        {[C.primary, "#059669", "#ea580c", "#db2777"].map((c, i) => (
          <div key={c} style={{ width: 80, height: 80, background: c, border: `3px solid ${c === k.color ? C.fg : "transparent"}`, outline: c === k.color ? `3px solid #fff` : undefined, outlineOffset: -7 }} />
        ))}
      </div>
      <div style={{ position: "absolute", top: 260, left: 40, width: 780, background: "#fff", border: `2px solid ${C.border}`, borderRadius: k.radius, overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.12)", transform: `scale(${1 + flash * 0.015})` }}>
        <div style={{ height: 120, background: k.color, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.25) 2px, transparent 2px)", backgroundSize: "20px 20px" }} />
        </div>
        <div style={{ padding: "28px 36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 18, color: C.muted }}>
            <div style={{ width: 30, height: 30, background: k.color, borderRadius: k.radius / 3 }} /> ACME WORKSHOPS
          </div>
          <div style={{ fontFamily: k.font, fontSize: 46, fontWeight: 800, margin: "14px 0 20px" }}>Workshop Feedback</div>
          <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 14 }}>Would you attend again?</div>
          {["Yes", "Maybe"].map((o, i) => (
            <div key={o} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", marginBottom: 10, border: `2px solid ${i === 0 ? k.color : C.border}`, borderRadius: k.radius / 2, fontSize: 22, background: i === 0 ? `${k.color}14` : "#fff" }}>
              <div style={{ width: 22, height: 22, borderRadius: 99, border: `6px solid ${i === 0 ? k.color : C.border}` }} />{o}
            </div>
          ))}
          <div style={{ marginTop: 14, display: "inline-block", background: k.color, color: "#fff", fontWeight: 800, fontSize: 20, padding: "14px 30px", borderRadius: k.radius / 2, letterSpacing: "0.08em" }}>SUBMIT</div>
          <span style={{ marginLeft: 20, fontFamily: MONO, fontSize: 16, color: C.muted }}>{k.name}</span>
        </div>
      </div>
      <Cursor x={cx} y={cy} pressed={Math.min(1, press)} />
    </div>
  );
};

export const Build: React.FC = () => {
  const f = useCurrentFrame();
  const out = (a: number) => ease(f, a, a + 12);
  const inn = (a: number) => ease(f, a, a + 16);
  return (
    <Bg>
      <div style={{ position: "absolute", left: 190, top: 250, width: 720 }}>
        <StepHeader num="01" title="Build it." />
        <Caption style={{ marginTop: 40 }} items={[[6, "Describe it. AI builds it."], [110, "12 question types, sections & branching."], [190, "Your logo, colours & fonts."]]} />
      </div>
      <AbsoluteFill style={{ left: 940, top: 140 }}>
        {f < 124 && (
          <div style={{ opacity: 1 - out(108), transform: `translateX(${(1 - inn(0)) * 200 + out(108) * 300}px)` }}>
            <AiPanel />
          </div>
        )}
        {f >= 110 && f < 204 && (
          <div style={{ position: "absolute", top: 70, opacity: 1 - out(188), transform: `translateX(${-out(188) * 200}px)` }}>
            <TypeGrid />
          </div>
        )}
        {f >= 188 && (
          <div style={{ position: "absolute", top: 0, opacity: inn(190), transform: `translateX(${(1 - inn(190)) * 200}px)` }}>
            <BrandKit />
          </div>
        )}
      </AbsoluteFill>

      <Sfx s="typing" at={TYPE_START} v={0.8} />
      <Sfx s="click" at={SEND} />
      <Sfx s="sparkle" at={SEND + 6} v={0.9} />
      <Sfx s="swoosh" at={106} v={0.8} />
      <Sfx s="pop" at={116} v={0.7} />
      <Sfx s="swoosh" at={186} v={0.8} />
      {KITS.slice(1).map((k) => <Sfx key={k.at} s="click" at={k.at} />)}
    </Bg>
  );
};
