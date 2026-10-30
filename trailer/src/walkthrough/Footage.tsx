import React from "react";
import { Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FPS, MONO } from "../brand";
import EV from "../../recording/events.json"; // written by scripts/record.mjs

// ---------- timeline mapping (recording seconds → composition frames) ----------
export const INTRO = 6 * FPS;
type Ev = { t: number; type: string; page?: string; [k: string]: any };
export const EVENTS = EV.events as Ev[];
const T_START = EVENTS.find((e) => e.type === "start")!.t;
export const toFrame = (t: number) => INTRO + Math.round((t - T_START) * FPS);
// Footage components render inside <Sequence from={INTRO}>, so their frame is local to the recording.
const toSec = (localFrame: number) => localFrame / FPS + T_START;

const ADMIN_SCALE = EV.admin.scale; // CSS px → footage px (DPR 1.2 → 1920×1080)
const PHONE_SCALE = 2; // 390×664 CSS → 780×1328 footage
const W = 1920, H = 1080;
const easeIO = Easing.bezier(0.45, 0, 0.2, 1);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ---------- camera (Screen-Studio style zoom, driven by focus/unfocus + actions inside a focus) ----------
type Cam = { t: number; z: number; cx: number; cy: number };
const center = (b: { x: number; y: number; w: number; h: number }) => ({ cx: (b.x + b.w / 2) * ADMIN_SCALE, cy: (b.y + b.h / 2) * ADMIN_SCALE });
const camKeys: Cam[] = [{ t: -1e9, z: 1, cx: W / 2, cy: H / 2 }];
{
  let z = 1;
  for (const e of EVENTS.filter((e) => e.page === "admin")) {
    if (e.type === "focus") { z = e.zoom; camKeys.push({ t: e.t, z, ...center(e.box) }); }
    else if (e.type === "unfocus") { z = 1; camKeys.push({ t: e.t, z: 1, cx: W / 2, cy: H / 2 }); }
    else if (z > 1 && e.type === "type") camKeys.push({ t: e.t, z, ...center(e.box) });
    else if (z > 1 && e.type === "click") camKeys.push({ t: e.t, z, cx: e.x * ADMIN_SCALE, cy: e.y * ADMIN_SCALE });
  }
}
const CAM_MOVE = 0.9;
const camStarts: Cam[] = [camKeys[0]!]; // camera value at the moment each key starts
for (let i = 1; i < camKeys.length; i++) camStarts.push(camAt(camKeys[i]!.t, i - 1));
function camAt(t: number, upto = camKeys.length - 1): Cam {
  let i = upto;
  while (i > 0 && camKeys[i]!.t > t) i--;
  const k = camKeys[i]!, from = camStarts[i] ?? k;
  const p = easeIO(clamp01((t - k.t) / CAM_MOVE));
  return { t, z: from.z + (k.z - from.z) * p, cx: from.cx + (k.cx - from.cx) * p, cy: from.cy + (k.cy - from.cy) * p };
}
const camTransform = (c: Cam) => {
  const cx = Math.min(W - W / 2 / c.z, Math.max(W / 2 / c.z, c.cx));
  const cy = Math.min(H - H / 2 / c.z, Math.max(H / 2 / c.z, c.cy));
  return `translate(${W / 2 - cx * c.z}px, ${H / 2 - cy * c.z}px) scale(${c.z})`;
};

// ---------- cursor ----------
const moves = EVENTS.filter((e) => e.type === "move" && e.page === "admin");
const clicks = EVENTS.filter((e) => e.type === "click" && e.page === "admin");
function cursorAt(t: number) {
  let prev = { x: 800, y: 450 };
  for (const m of moves) {
    if (m.t > t) break;
    const p = easeIO(clamp01((t - m.t) / m.dur));
    if (p < 1) return { x: prev.x + (m.x - prev.x) * p, y: prev.y + (m.y - prev.y) * p };
    prev = { x: m.x, y: m.y };
  }
  return prev;
}

const urlOf = (page: string, t: number) => {
  const u = [...EVENTS].reverse().find((e) => e.type === "url" && e.page === page && e.t <= t)?.url ?? "";
  return u.replace(/^https?:\/\/(localhost:5174|kollects\.tech)/, "kollects.tech").replace(/\/$/, "")
    .replace(/\/([0-9a-f]{8})[0-9a-f-]{16,}/g, "/$1…") || "kollects.tech"; // shorten long ids for display
};

/** Callout ring + label: dims everything else a touch and labels the element. */
const Spots: React.FC<{ page: string; t: number; scale: number }> = ({ page, t, scale }) => (
  <>
    {EVENTS.filter((e) => e.type === "spot" && e.page === page && t >= e.t - 0.1 && t <= e.t + e.dur + 0.4).map((e, i) => {
      const inP = easeIO(clamp01((t - e.t) / 0.35)), outP = easeIO(clamp01((t - e.t - e.dur) / 0.4));
      const o = inP * (1 - outP), pad = 10;
      const b = { x: e.box.x * scale - pad, y: e.box.y * scale - pad, w: e.box.w * scale + pad * 2, h: e.box.h * scale + pad * 2 };
      const above = b.y > 120;
      return (
        <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, border: `4px solid ${C.primary}`, borderRadius: 10, opacity: o, transform: `scale(${1.06 - 0.06 * inP})`, boxShadow: `0 0 0 4000px rgba(20,18,16,${0.22 * o}), 0 0 30px ${C.primary}88`, pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: -4, [above ? "bottom" : "top"]: "calc(100% + 12px)", whiteSpace: "nowrap", background: C.ink, color: "#fff", fontFamily: MONO, fontSize: 24, letterSpacing: "0.04em", padding: "8px 16px", borderLeft: `5px solid ${C.primary}` }}>
            {e.label}
          </div>
        </div>
      );
    })}
  </>
);

/** Admin browser footage inside the app's industrial frame, with camera, cursor, clicks and callouts. */
export const AdminFootage: React.FC<{ w: number }> = ({ w }) => {
  const f = useCurrentFrame();
  const t = toSec(f);
  const cam = camAt(t);
  const cur = cursorAt(t);
  const press = clicks.reduce((a, c) => Math.max(a, 1 - Math.abs(t - c.t) / 0.12), 0);
  const s = w / W;
  return (
    <div style={{ width: w, background: C.card, border: `2px solid ${C.fg}`, boxShadow: `12px 12px 0 ${C.fg}` }}>
      <div style={{ height: 44, borderBottom: `2px solid ${C.fg}`, display: "flex", alignItems: "center", gap: 9, padding: "0 16px" }}>
        {[C.red, "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 13, height: 13, background: c, border: `1.5px solid ${C.fg}` }} />)}
        <div style={{ marginLeft: 16, flex: 1, height: 28, border: `1.5px solid ${C.border}`, background: "#fff", fontFamily: MONO, fontSize: 17, color: C.muted, display: "flex", alignItems: "center", padding: "0 12px" }}>
          🔒 {urlOf("admin", t)}
        </div>
      </div>
      <div style={{ width: w, height: w * (H / W), overflow: "hidden", position: "relative" }}>
        <div style={{ width: W, height: H, transform: `scale(${s})`, transformOrigin: "0 0" }}>
          <div style={{ width: W, height: H, position: "relative", transform: camTransform(cam), transformOrigin: "0 0" }}>
            <OffthreadVideo src={staticFile("wt/admin.mp4")} muted style={{ width: W, height: H }} trimBefore={Math.round(T_START * FPS)} />
            <Spots page="admin" t={t} scale={ADMIN_SCALE} />
            {clicks.filter((c) => t >= c.t && t <= c.t + 0.5).map((c, i) => {
              const p = (t - c.t) / 0.5;
              return <div key={i} style={{ position: "absolute", left: c.x * ADMIN_SCALE - 30, top: c.y * ADMIN_SCALE - 30, width: 60, height: 60, borderRadius: 99, border: `4px solid ${C.primary}`, transform: `scale(${0.4 + p * 1.2})`, opacity: 1 - p }} />;
            })}
            <svg width={46} height={46} viewBox="0 0 24 24" style={{ position: "absolute", left: cur.x * ADMIN_SCALE - 4, top: cur.y * ADMIN_SCALE - 3, transform: `scale(${(1 - press * 0.18) / Math.sqrt(cam.z)})`, transformOrigin: "4px 3px", filter: "drop-shadow(2px 3px 3px rgba(0,0,0,0.35))" }}>
              <path d="M4 3 L19 12 L12 13.5 L9 20 Z" fill={C.fg} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Respondent phone footage in a device frame, with tap ripples and the URL pill above it. */
export const PhoneFootage: React.FC<{ w: number }> = ({ w }) => {
  const f = useCurrentFrame();
  const t = toSec(f);
  const bezel = 14;
  const sw = w - bezel * 2, sh = sw * (664 / 390);
  const s = sw / (390 * PHONE_SCALE);
  const url = urlOf("phone", t);
  return (
    <div style={{ position: "relative", width: w }}>
      <div style={{ position: "absolute", bottom: "calc(100% + 14px)", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 18, background: "#fff", border: `2px solid ${C.fg}`, padding: "6px 14px", whiteSpace: "nowrap" }}>{url === "kollects.tech" ? "📱 Respondent's phone" : `🔒 ${url}`}</div>
      </div>
      <div style={{ width: w, padding: bezel, background: "#111", borderRadius: 52, boxShadow: "0 40px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ width: sw, height: sh, borderRadius: 40, overflow: "hidden", position: "relative", background: C.bg }}>
          <div style={{ width: 390 * PHONE_SCALE, height: 664 * PHONE_SCALE, transform: `scale(${s})`, transformOrigin: "0 0", position: "relative" }}>
            <OffthreadVideo src={staticFile("wt/phone.mp4")} muted style={{ width: 780, height: 1328 }} trimBefore={Math.round(T_START * FPS)} />
            <Spots page="phone" t={t} scale={PHONE_SCALE} />
            {EVENTS.filter((e) => e.type === "tap" && t >= e.t && t <= e.t + 0.55).map((e, i) => {
              const p = (t - e.t) / 0.55;
              return <div key={i} style={{ position: "absolute", left: e.x * PHONE_SCALE - 45, top: e.y * PHONE_SCALE - 45, width: 90, height: 90, borderRadius: 99, background: `${C.primary}55`, border: `5px solid ${C.primary}`, transform: `scale(${0.3 + p})`, opacity: 1 - p }} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Smoothly blend between per-beat layouts over ~0.6s. */
export const blend = (f: number, at: number, a: number, b: number) =>
  interpolate(f, [at, at + 18], [a, b], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeIO });
