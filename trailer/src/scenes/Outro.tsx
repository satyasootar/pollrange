import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ArrowRight, Award, CheckCircle2, Clock, FileText, IndianRupee, Palette, ShieldCheck, Upload, Zap } from "lucide-react";
import { C, MONO, ease, pop } from "../brand";
import { Bg, Cursor, Logo, Sfx, Slam } from "../components";

// Copy from frontend/src/components/landing/features.tsx (+ UPI and brand kit from pricing/branding).
const FEATURES: [React.ElementType, string, string, string][] = [
  [Zap, "Core", "Instant Results", "Votes appear right away. No refresh, no waiting."],
  [FileText, "Forms", "Forms & Surveys", "Many question types, sections, grids and validation."],
  [Award, "Quizzes", "Auto-Graded Quizzes", "Scores are ready the moment someone submits."],
  [Clock, "Analytics", "Granular Timelines", "By the minute, hour, day, week or month."],
  [Upload, "Media", "File Uploads", "Collect images and documents in the background."],
  [ShieldCheck, "Security", "Anonymous Mode", "No login, or require sign-in. You choose."],
  [IndianRupee, "Payments", "UPI Payments", "Add prices to options and collect via UPI."],
  [Palette, "Branding", "Brand Kit", "Your logo, colours, fonts and custom links."],
];

export const Features: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Bg>
      <div style={{ position: "absolute", left: 190, top: 90 }}>
        <Slam size={104} words={[{ t: "Everything", at: 2 }, { t: "you", at: 8 }, { t: "need", at: 14 }, { t: "to", at: 18 }, { t: "ask.", at: 22, color: C.primary }]} />
      </div>
      <div style={{ position: "absolute", left: 190, top: 300, width: 1540, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: `2px solid ${C.fg}`, borderLeft: `2px solid ${C.fg}` }}>
        {FEATURES.map(([Icon, label, title, desc], i) => {
          const p = pop(f, 34 + i * 6, 14);
          const hot = ease(f, 120 + i * 7, 126 + i * 7) * (1 - ease(f, 134 + i * 7, 142 + i * 7));
          const inv = hot > 0.5;
          return (
            <div key={title} style={{ height: 330, padding: 34, borderRight: `2px solid ${C.fg}`, borderBottom: `2px solid ${C.fg}`, background: inv ? C.primary : C.card, color: inv ? "#fff" : C.fg, opacity: p, transform: `translateY(${(1 - p) * 50}px)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 46 }}>
                <div style={{ width: 66, height: 66, border: `2px solid ${inv ? "#fff" : C.primary}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${(1 - p) * -90}deg)` }}>
                  <Icon size={32} color={inv ? "#fff" : C.primary} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 16, letterSpacing: "0.2em", textTransform: "uppercase", color: inv ? "#fff" : C.muted }}>{label}</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 14 }}>{title}</div>
              <div style={{ fontSize: 22, lineHeight: 1.4, color: inv ? "#e0e7ff" : C.muted }}>{desc}</div>
            </div>
          );
        })}
      </div>
      {[0, 2, 4, 6].map((i) => <Sfx key={i} s="pop" at={34 + i * 6} v={0.6} />)}
    </Bg>
  );
};

const CLICK = 104;
const END_CARD = 140;
const HIT = 150; // matches the final hit in music.wav (58s)

export const CTA: React.FC = () => {
  const f = useCurrentFrame();
  const out = ease(f, END_CARD - 12, END_CARD);
  const btn = pop(f, 64, 12);
  const pressed = Math.max(0, 1 - Math.abs(f - CLICK) / 5);
  const cx = interpolate(f, [72, 100], [1100, 430], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = interpolate(f, [72, 100], [1040, 805], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const word = ease(f, HIT + 4, HIT + 20);
  const tag = ease(f, HIT + 18, HIT + 34);
  return (
    <Bg>
      {f < END_CARD && (
        <AbsoluteFill style={{ opacity: 1 - out, transform: `scale(${1 + out * 0.08})` }}>
          <div style={{ position: "absolute", left: 190, top: 220 }}>
            <Slam size={150} words={[{ t: "Ready", at: 2 }, { t: "to", at: 8 }, { t: "hear", at: 14 }]} />
            <Slam size={150} style={{ marginTop: 10 }} words={[{ t: "your", at: 22 }, { t: "audience?", at: 30, color: C.primary, underline: true }]} />
            <div style={{ display: "flex", gap: 40, marginTop: 60 }}>
              {["No credit card", "Free plan forever", "1,000 responses / month"].map((t, i) => {
                const p = ease(f, 46 + i * 5, 56 + i * 5);
                return (
                  <span key={t} style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 28, color: C.muted, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
                    <CheckCircle2 size={30} color={C.primary} /> {t}
                  </span>
                );
              })}
            </div>
          </div>
          <div style={{ position: "absolute", left: 190, top: 760, transform: `scale(${btn * (1 - pressed * 0.06)})`, background: f >= CLICK ? C.primary : C.fg, color: "#fff", padding: "34px 50px", fontSize: 32, fontWeight: 800, letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 16, boxShadow: `${10 - pressed * 8}px ${10 - pressed * 8}px 0 ${f >= CLICK ? C.fg : C.primary}` }}>
            CREATE FREE POLL <ArrowRight size={36} />
          </div>
          {f >= CLICK && f < CLICK + 16 && (
            <div style={{ position: "absolute", left: 440, top: 815, width: 40, height: 40, margin: -20, borderRadius: 99, border: `4px solid ${C.primary}`, transform: `scale(${1 + ease(f, CLICK, CLICK + 16) * 8})`, opacity: 1 - ease(f, CLICK, CLICK + 16) }} />
          )}
          <Cursor x={cx} y={cy} pressed={pressed} />
        </AbsoluteFill>
      )}

      {f >= END_CARD && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 36, transform: `scale(${1 + (1 - ease(f, HIT, HIT + 30)) * 0.08})` }}>
            <Logo size={250} delay={HIT - 6} />
            <div style={{ fontSize: 170, fontWeight: 800, letterSpacing: "-0.04em", clipPath: `inset(0 ${(1 - word) * 100}% 0 0)` }}>KOLLECTS</div>
          </div>
          <div style={{ marginTop: 40, fontFamily: MONO, fontSize: 40, letterSpacing: "0.2em", color: C.primary, opacity: tag, transform: `translateY(${(1 - tag) * 20}px)` }}>
            KOLLECTS.TECH
          </div>
          <div style={{ marginTop: 18, fontSize: 30, fontWeight: 500, color: C.muted, opacity: ease(f, HIT + 28, HIT + 44) }}>
            Polls, forms & quizzes with live results.
          </div>
        </AbsoluteFill>
      )}

      <Sfx s="pop" at={64} v={0.7} />
      <Sfx s="click" at={CLICK} />
      <Sfx s="whoosh" at={END_CARD - 12} v={0.9} />
      <Sfx s="riser" at={HIT - 77} v={0.9} />
      <Sfx s="impact" at={HIT} v={1} />
      <Sfx s="sparkle" at={HIT + 18} v={0.7} />
    </Bg>
  );
};
