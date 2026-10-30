import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FPS } from "../brand";
import { Bg, Sfx, Wipe } from "../components";
import { Subtitles, subsFor } from "../subtitles";
import SCRIPT from "../../walkthrough/script.json";
import VOICE from "./voice.json"; // scripts/voice.py --walkthrough
import { ChapterBar, Intro, Outro, UpiExplainer } from "./Bookends";
import { AdminFootage, EVENTS, INTRO, PhoneFootage, blend, toFrame } from "./Footage";

// ---------- timeline ----------
const beatAt = Object.fromEntries(EVENTS.filter((e) => e.type === "beat").map((e) => [e.id, toFrame(e.t)]));
const LINES = VOICE.map((v) => ({ ...v, from: beatAt[v.id]! }));
const OUTRO_FROM = beatAt.e1!;
export const WT_TOTAL = OUTRO_FROM + Math.round(Math.max(LINES.at(-1)!.dur + 3, 10) * FPS);

const CHAPTERS = EVENTS.filter((e) => e.type === "chapter" && e.id !== "outro").map((e) => ({
  id: e.id as string,
  title: SCRIPT.chapters.find((c) => c.id === e.id)!.title,
  from: toFrame(e.t),
}));

// ---------- layouts (blend at each beat start) ----------
type L = { ax: number; ay: number; aw: number; ao: number; px: number; py: number; pw: number; xo: number };
const LAYOUT: Record<string, L> = {
  admin: { ax: 180, ay: 92, aw: 1560, ao: 1, px: 1990, py: 170, pw: 440, xo: 0 },
  split: { ax: 70, ay: 150, aw: 1260, ao: 1, px: 1400, py: 170, pw: 440, xo: 0 },
  phone: { ax: 70, ay: 150, aw: 1260, ao: 0, px: 1240, py: 150, pw: 520, xo: 1 },
};
const layoutOf = (i: number) => LAYOUT[(LINES[i] as { layout?: string } | undefined)?.layout ?? "admin"]!;
function layoutAt(f: number): L {
  let i = LINES.findLastIndex((l) => f >= l.from);
  if (i < 0) i = 0;
  const from = layoutOf(i - 1), to = layoutOf(i), at = LINES[i]!.from;
  return Object.fromEntries(Object.keys(to).map((k) => [k, blend(f, at, from[k as keyof L], to[k as keyof L])])) as L;
}

const Stage: React.FC = () => {
  const f = useCurrentFrame() + INTRO; // this component lives in <Sequence from={INTRO}>
  const l = layoutAt(f);
  return (
    <Bg>
      <div style={{ position: "absolute", left: l.ax, top: l.ay, opacity: l.ao, transform: `scale(${0.96 + 0.04 * l.ao})`, transformOrigin: "left center" }}>
        <AdminFootage w={l.aw} />
      </div>
      {l.xo > 0.01 && (
        <div style={{ position: "absolute", left: 150, top: 120, opacity: l.xo, transform: `translateX(${(1 - l.xo) * -60}px)` }}>
          <Sequence from={beatAt.u3! - INTRO} layout="none">
            <UpiExplainer u4={beatAt.u4! - beatAt.u3!} u5={beatAt.u5! - beatAt.u3!} />
          </Sequence>
        </div>
      )}
      <div style={{ position: "absolute", left: l.px, top: l.py }}>
        <PhoneFootage w={l.pw} />
      </div>
    </Bg>
  );
};

// ---------- audio ----------
const voiceOn = (f: number) => LINES.some((v) => f >= v.from - 4 && f <= v.from + v.dur * FPS + 4);
const bedVolume = (f: number) => {
  let on = 0;
  for (let d = -8; d <= 8; d += 2) on += voiceOn(f + d) ? 1 : 0;
  const duck = 1 - 0.75 * (on / 9);
  const fade = interpolate(f, [0, 20, WT_TOTAL - 75, WT_TOTAL], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return 0.26 * duck * fade; // a bed, not a feature: ~-25 dB between lines, ~18 dB under the voice
};
// "Vastness" (Mixkit #184): warm ambient piano, rock-steady level, 3:50 with a fade in the last 10s
// → crossfade a second pass (from 0:10) in at 3:30.
const BED_SPLIT = 210 * FPS;
const XFADE = 6 * FPS;
const SFX_EVENTS = EVENTS.filter((e) => ["click", "tap", "type", "chapter"].includes(e.type) && toFrame(e.t) < OUTRO_FROM);

export const Walkthrough: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Sequence durationInFrames={INTRO}><Intro /></Sequence>
    <Sequence from={INTRO} durationInFrames={OUTRO_FROM - INTRO}>
      <Stage />
    </Sequence>
    <Sequence from={INTRO} durationInFrames={OUTRO_FROM - INTRO} layout="none">
      <ChapterBar chapters={CHAPTERS.map((c) => ({ ...c, from: c.from - INTRO }))} end={OUTRO_FROM - INTRO} />
    </Sequence>
    <Sequence from={OUTRO_FROM}><Outro /></Sequence>
    {[INTRO, OUTRO_FROM].map((at) => (
      <Sequence key={at} from={at - 10} durationInFrames={20}><Wipe /><Sfx s="whoosh" at={0} v={0.7} /></Sequence>
    ))}
    <Subtitles subs={subsFor(LINES, (l) => l.from)} />

    {LINES.map((l) => (
      <Sequence key={l.id} from={l.from} layout="none">
        <Html5Audio src={staticFile(`wt-voice/${l.id}.wav`)} />
      </Sequence>
    ))}
    {SFX_EVENTS.map((e, i) => {
      const at = toFrame(e.t);
      if (e.type === "click") return <Sfx key={i} s="click" at={at} v={0.45} />;
      if (e.type === "tap") return <Sfx key={i} s="pop" at={at} v={0.45} />;
      if (e.type === "type") return <Sfx key={i} s="typing" at={at} v={0.35} />;
      return <Sfx key={i} s="swoosh" at={at} v={0.6} />;
    })}
    <Sfx s="positive" at={beatAt.v4!} v={0.6} />
    <Sfx s="correct" at={beatAt.u3!} v={0.6} />
    <Sfx s="impact" at={OUTRO_FROM + 4} v={0.4} />
    <Sfx s="sparkle" at={OUTRO_FROM + 100} v={0.3} />

    <Sequence durationInFrames={BED_SPLIT + XFADE} layout="none">
      <Html5Audio src={staticFile("audio/bed.mp3")} volume={(f) => bedVolume(f) * interpolate(f, [BED_SPLIT, BED_SPLIT + XFADE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
    </Sequence>
    <Sequence from={BED_SPLIT} layout="none">
      <Html5Audio src={staticFile("audio/bed.mp3")} trimBefore={10 * FPS} volume={(f) => bedVolume(f + BED_SPLIT) * interpolate(f, [0, XFADE], [0, 1], { extrapolateRight: "clamp" })} />
    </Sequence>
  </AbsoluteFill>
);
