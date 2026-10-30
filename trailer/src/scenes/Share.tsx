import React from "react";
import { interpolate, staticFile, useCurrentFrame } from "remotion";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy } from "lucide-react";
import { C, MONO, ease, pop } from "../brand";
import { Bg, Caption, Label, Phone, Sfx, StepHeader } from "../components";

const TOKEN = "x7Kq2Lm";
const COPY = 36;
const PHONE_IN = 80;
const TAP = 118;
const SUBMIT = 136;
const THANKS = 144;
const OPTIONS = ["Live quizzes", "Dark mode", "Mobile app", "Integrations"];

const PollScreen: React.FC = () => {
  const f = useCurrentFrame();
  const sel = f >= TAP;
  const thanks = pop(f, THANKS, 12);
  return (
    <div style={{ padding: "70px 26px 26px", height: "100%", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>
        <img src={staticFile("logo.png")} style={{ width: 30, height: 30 }} /> KOLLECTS
      </div>
      <div style={{ height: 6, background: C.border, margin: "18px 0" }}>
        <div style={{ height: "100%", width: `${sel ? 100 : 40}%`, background: C.primary }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>What should we build next?</div>
      {OPTIONS.map((o, i) => {
        const on = sel && i === 0;
        return (
          <div key={o} style={{ border: `2px solid ${on ? C.primary : C.border}`, background: on ? `${C.primary}14` : "#fff", padding: "16px 16px", marginBottom: 10, fontSize: 20, fontWeight: 600, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: 99, border: `${on ? 6 : 2}px solid ${on ? C.primary : C.border}` }} />
            {o}
          </div>
        );
      })}
      <div style={{ marginTop: 16, background: f >= SUBMIT ? C.primary : C.fg, color: "#fff", textAlign: "center", padding: 16, fontWeight: 800, fontSize: 17, letterSpacing: "0.12em" }}>SUBMIT RESPONSE</div>
      {/* finger tap */}
      {[TAP, SUBMIT].map((t, i) => {
        const r = ease(f, t - 2, t + 10);
        if (f < t - 2 || f > t + 10) return null;
        return <div key={t} style={{ position: "absolute", left: i ? 160 : 70, top: i ? 543 : 256, width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: 99, border: `4px solid ${C.primary}`, transform: `scale(${0.4 + r})`, opacity: 1 - r }} />;
      })}
      {f >= THANKS && (
        <div style={{ position: "absolute", inset: 0, background: C.card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: Math.min(1, thanks * 2) }}>
          <div style={{ width: 110, height: 110, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${thanks}) rotate(${(1 - thanks) * -90}deg)` }}>
            <Check size={64} color="#fff" strokeWidth={3} />
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, marginTop: 28 }}>Thank you!</div>
          <div style={{ fontSize: 18, color: C.muted, marginTop: 8 }}>Your response was recorded.</div>
        </div>
      )}
    </div>
  );
};

export const Share: React.FC = () => {
  const f = useCurrentFrame();
  const typed = TOKEN.slice(0, Math.floor(interpolate(f, [12, 30], [0, TOKEN.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const link = pop(f, 4, 14);
  const copied = f >= COPY;
  const qr = pop(f, 44, 13);
  const scan = ease(f, 56, 80);
  const phone = pop(f, PHONE_IN, 16);
  const badge = pop(f, 98, 9);
  return (
    <Bg>
      <div style={{ position: "absolute", left: 190, top: 250, width: 700 }}>
        <StepHeader num="02" title="Share it." />
        <Caption style={{ marginTop: 40 }} items={[[6, "One link. One QR code."], [92, "No sign-up needed to answer."]]} />
      </div>

      {/* link pill */}
      <div style={{ position: "absolute", left: 900, top: 150, display: "flex", border: `2px solid ${C.fg}`, boxShadow: `8px 8px 0 ${C.fg}`, background: "#fff", opacity: link, transform: `translateY(${(1 - link) * 40}px)` }}>
        <div style={{ padding: "22px 28px", fontFamily: MONO, fontSize: 30, minWidth: 520 }}>
          <span style={{ color: C.muted }}>kollects.tech/p/</span>
          <span style={{ color: C.primary, fontWeight: 700 }}>{typed}</span>
        </div>
        <div style={{ background: copied ? C.primary : C.fg, color: "#fff", display: "flex", alignItems: "center", gap: 10, padding: "0 26px", fontWeight: 800, fontSize: 20, letterSpacing: "0.12em" }}>
          {copied ? <Check size={24} /> : <Copy size={22} />} {copied ? "COPIED" : "COPY"}
        </div>
      </div>

      {/* QR card */}
      <div style={{ position: "absolute", left: 900, top: 330, width: 440, background: "#fff", border: `2px solid ${C.fg}`, boxShadow: `8px 8px 0 ${C.fg}`, padding: 30, opacity: Math.min(1, qr * 2), transform: `scale(${0.6 + 0.4 * qr}) rotate(${(1 - qr) * -6}deg)` }}>
        <Label style={{ fontSize: 16 }}>Scan to vote</Label>
        <div style={{ position: "relative", marginTop: 22 }}>
          <QRCodeSVG value={`https://kollects.tech/p/${TOKEN}`} size={376} fgColor={C.fg} bgColor="#fff" level="H"
            imageSettings={{ src: staticFile("logo.png"), height: 76, width: 76, excavate: true }} />
          {scan > 0 && scan < 1 && <div style={{ position: "absolute", left: -10, right: -10, top: `${scan * 100}%`, height: 6, background: C.primary, boxShadow: `0 0 30px 8px ${C.primary}88` }} />}
        </div>
      </div>

      {/* phone */}
      <div style={{ position: "absolute", left: 1420, top: 290, transform: `translateY(${(1 - phone) * 900}px) rotate(${(1 - phone) * 10}deg)` }}>
        <Phone w={370}><PollScreen /></Phone>
        <div style={{ position: "absolute", left: -200, top: 640, background: C.primary, color: "#fff", fontWeight: 800, fontSize: 26, letterSpacing: "0.1em", padding: "16px 26px", border: `3px solid ${C.fg}`, boxShadow: `6px 6px 0 ${C.fg}`, transform: `scale(${badge}) rotate(-7deg)`, opacity: badge > 0.02 ? 1 : 0 }}>
          NO ACCOUNT NEEDED
        </div>
      </div>

      <Sfx s="typing" at={10} v={0.7} />
      <Sfx s="click" at={COPY} />
      <Sfx s="bubble" at={44} v={0.8} />
      <Sfx s="swoosh" at={PHONE_IN - 4} v={0.9} />
      <Sfx s="pop" at={98} v={0.8} />
      <Sfx s="click" at={TAP} />
      <Sfx s="click" at={SUBMIT} />
      <Sfx s="correct" at={THANKS} v={0.9} />
    </Bg>
  );
};
