import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ArrowDown, Building2, Check, IndianRupee, QrCode, Smartphone } from "lucide-react";
import { C, MONO, SANS, ease, pop } from "../brand";
import { Bg, Label, Logo, Slam } from "../components";

/** 6s opener: logo builds, wordmark, what this video covers. */
export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const word = ease(f, 18, 34);
  return (
    <Bg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <Logo size={190} delay={2} />
          <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: "-0.04em", clipPath: `inset(0 ${(1 - word) * 100}% 0 0)` }}>KOLLECTS</div>
        </div>
        <div style={{ opacity: ease(f, 40, 56), transform: `translateY(${(1 - ease(f, 40, 56)) * 20}px)`, textAlign: "center" }}>
          <Label>Product walkthrough</Label>
          <div style={{ marginTop: 22, fontSize: 40, fontWeight: 500, color: C.muted }}>Polls · Forms · Live results · UPI payments · Brand kit</div>
        </div>
      </AbsoluteFill>
    </Bg>
  );
};

/** Final card: logo, wordmark, URL and the free-plan hook. */
export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const word = ease(f, 14, 30);
  const line = (at: number) => ({ opacity: ease(f, at, at + 14), transform: `translateY(${(1 - ease(f, at, at + 14)) * 18}px)` });
  return (
    <Bg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <Logo size={220} delay={4} />
          <div style={{ fontSize: 170, fontWeight: 800, letterSpacing: "-0.04em", clipPath: `inset(0 ${(1 - word) * 100}% 0 0)` }}>KOLLECTS</div>
        </div>
        <div style={{ marginTop: 36 }}>
          <Slam size={56} words={[{ t: "Build", at: 36 }, { t: "it.", at: 40 }, { t: "Share", at: 52 }, { t: "it.", at: 56 }, { t: "Watch", at: 68 }, { t: "it", at: 72 }, { t: "live.", at: 76, color: C.primary }]} />
        </div>
        <div style={{ ...line(100), marginTop: 44, display: "flex", gap: 22, alignItems: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: 40, letterSpacing: "0.12em", color: "#fff", background: C.primary, padding: "14px 30px", border: `3px solid ${C.fg}`, boxShadow: `8px 8px 0 ${C.fg}` }}>KOLLECTS.TECH</div>
        </div>
        <div style={{ ...line(116), marginTop: 30, fontSize: 30, color: C.muted, fontWeight: 500 }}>Start free · 1,000 responses a month · No credit card</div>
      </AbsoluteFill>
    </Bg>
  );
};

/** Thin chapter progress bar + a lower-third when a chapter starts. */
export const ChapterBar: React.FC<{ chapters: { id: string; title: string; from: number }[]; end: number }> = ({ chapters, end }) => {
  const f = useCurrentFrame();
  const idx = chapters.findLastIndex((c) => f >= c.from);
  if (idx < 0) return null;
  const cur = chapters[idx]!;
  const card = ease(f, cur.from, cur.from + 14) * (1 - ease(f, cur.from + 95, cur.from + 112));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: SANS }}>
      <div style={{ position: "absolute", top: 22, left: 150, right: 150, display: "flex", gap: 8 }}>
        {chapters.map((c, i) => {
          const next = chapters[i + 1]?.from ?? end;
          const fill = i < idx ? 1 : i > idx ? 0 : Math.min(1, (f - c.from) / (next - c.from));
          return (
            <div key={c.id} style={{ flex: 1 }}>
              <div style={{ height: 6, background: `${C.fg}1f` }}><div style={{ height: "100%", width: `${fill * 100}%`, background: C.primary }} /></div>
              <div style={{ marginTop: 7, fontFamily: MONO, fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: i === idx ? C.fg : C.muted, whiteSpace: "nowrap", overflow: "hidden" }}>{c.title}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 150, bottom: 140, opacity: card, transform: `translateX(${(1 - card) * -40}px)`, display: "flex", alignItems: "stretch", boxShadow: `8px 8px 0 ${C.fg}` }}>
        <div style={{ background: C.primary, color: "#fff", fontFamily: MONO, fontSize: 34, fontWeight: 700, padding: "16px 22px" }}>{String(idx + 1).padStart(2, "0")}</div>
        <div style={{ background: C.ink, color: "#fff", fontSize: 40, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.02em", padding: "16px 28px" }}>{cur.title}</div>
      </div>
    </AbsoluteFill>
  );
};

const Step: React.FC<{ at: number; icon: React.ElementType; title: string; children: React.ReactNode }> = ({ at, icon: Icon, title, children }) => {
  const f = useCurrentFrame();
  const p = pop(f, at, 15);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 30}px)`, display: "flex", gap: 22, alignItems: "flex-start", background: "#fff", border: `2px solid ${C.fg}`, boxShadow: `8px 8px 0 ${C.fg}`, padding: "22px 26px" }}>
      <div style={{ width: 60, height: 60, flexShrink: 0, background: `${C.primary}14`, border: `2px solid ${C.primary}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={30} color={C.primary} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 24, color: C.muted, lineHeight: 1.4 }}>{children}</div>
      </div>
    </div>
  );
};

const Arrow: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  return <div style={{ display: "flex", justifyContent: "center", height: 34, opacity: ease(f, at, at + 10) }}><ArrowDown size={30} color={C.primary} /></div>;
};

/** "How UPI payments work" — builds one step per narration beat (u3, u4, u5), frames relative to u3. */
export const UpiExplainer: React.FC<{ u4: number; u5: number }> = ({ u4, u5 }) => {
  const f = useCurrentFrame();
  const head = ease(f, 0, 14);
  const code = (k: string, v: string) => (<><span style={{ color: C.primary }}>{k}</span>={v}</>);
  return (
    <div style={{ width: 960 }}>
      <div style={{ opacity: head, transform: `translateY(${(1 - head) * 20}px)` }}>
        <Label>How UPI payments work</Label>
        <div style={{ fontSize: 64, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.95, margin: "18px 0 30px" }}>
          Straight to <span style={{ color: C.primary, fontStyle: "italic" }}>your</span> account.
        </div>
      </div>
      <Step at={8} icon={IndianRupee} title="Kollects totals the order">
        Hackathon ₹299 + Robo Race ₹199 = <b style={{ color: C.fg }}>₹498</b>
      </Step>
      <Arrow at={u4 - 6} />
      <Step at={u4} icon={QrCode} title="A standard UPI request">
        <div style={{ fontFamily: MONO, fontSize: 19, background: C.card, border: `1.5px solid ${C.border}`, padding: "8px 12px", margin: "4px 0 10px", color: C.fg, wordBreak: "break-all" }}>
          upi://pay?{code("pa", "techfest@okaxis")}&{code("am", "498.00")}&{code("cu", "INR")}&{code("tn", "Ref…")}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Smartphone size={20} /> Opens pre-filled in GPay, PhonePe, Paytm or any UPI app</span>
      </Step>
      <Arrow at={u5 - 6} />
      <Step at={u5} icon={Building2} title="Money lands with you">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Check size={20} color={C.green} /> Kollects never holds your funds</span><br />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Check size={20} color={C.green} /> The note matches each payment to its response</span>
      </Step>
    </div>
  );
};
