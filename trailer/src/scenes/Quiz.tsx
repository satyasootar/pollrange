import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Check, Trophy } from "lucide-react";
import { C, MONO, ease, pop } from "../brand";
import { Bg, Caption, Cursor, Label, Sfx } from "../components";

const ANSWER = 62;
const SCORE = 84;
const BOARD = 104;
const RESHUFFLE = 132;
const OPTS = ["Venus", "Mars", "Jupiter", "Saturn"];

// [name, points before, points after]
const PLAYERS: [string, number, number][] = [
  ["Aarav S.", 92, 92], ["Priya K.", 88, 90], ["Rohan M.", 81, 84], ["You", 72, 98], ["Ananya R.", 66, 70],
];
const rankOf = (key: 1 | 2) => [...PLAYERS].sort((a, b) => b[key] - a[key]).map((p) => p[0]);

const Confetti: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const f = useCurrentFrame();
  const t = (f - at) / 30;
  if (t < 0 || t > 1.6) return null;
  return (
    <>
      {Array.from({ length: 46 }, (_, i) => {
        const a = (i / 46) * Math.PI * 2 + i;
        const v = 500 + (i % 7) * 90;
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t * 0.8 + 700 * t * t;
        return <div key={i} style={{ position: "absolute", left: px, top: py, width: 16, height: 10, background: [C.primary, "#f59e0b", C.green, "#ec4899", C.primaryLight][i % 5], transform: `rotate(${i * 40 + f * 18}deg)`, opacity: 1 - t / 1.6 }} />;
      })}
    </>
  );
};

const QuizCard: React.FC = () => {
  const f = useCurrentFrame();
  const secs = Math.max(0, 10 - Math.floor(interpolate(f, [8, ANSWER], [0, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const ring = interpolate(f, [8, ANSWER], [1, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ok = f >= ANSWER;
  const flip = ease(f, SCORE - 6, SCORE + 6);
  const score = pop(f, SCORE, 10);
  const cx = interpolate(f, [20, 54], [660, 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = interpolate(f, [20, 54], [700, 352], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative", width: 720, height: 680, background: "#fff", border: `2px solid ${C.fg}`, boxShadow: `14px 14px 0 ${C.fg}`, transform: `rotateY(${flip * 180}deg)`, transformStyle: "preserve-3d" }}>
      {flip < 0.5 ? (
        <div style={{ padding: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.2em", color: C.muted }}>QUESTION 4 / 10</span>
            <svg width={92} height={92} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={42} stroke={C.border} strokeWidth={9} fill="none" />
              <circle cx={50} cy={50} r={42} stroke={secs <= 7 ? "#f59e0b" : C.primary} strokeWidth={9} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ring} transform="rotate(-90 50 50)" />
              <text x={50} y={62} textAnchor="middle" fontSize={34} fontWeight={800} fill={C.fg}>{secs}</text>
            </svg>
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: "20px 0 30px" }}>Which planet is known as the Red Planet?</div>
          {OPTS.map((o, i) => {
            const right = ok && i === 1;
            return (
              <div key={o} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", marginBottom: 12, fontSize: 26, fontWeight: 700, border: `2px solid ${right ? C.green : C.border}`, background: right ? "#dcfce7" : "#fff", transform: right ? `scale(${1 + 0.04 * (1 - ease(f, ANSWER, ANSWER + 10))})` : undefined }}>
                {o}
                {right && <Check size={32} color={C.green} strokeWidth={3} />}
              </div>
            );
          })}
          {ok && <div style={{ position: "absolute", right: 60, top: 340 - ease(f, ANSWER, ANSWER + 20) * 60, fontWeight: 800, fontSize: 34, color: C.green, opacity: 1 - ease(f, ANSWER + 14, ANSWER + 22) }}>+10 pts</div>}
          {f < ANSWER + 4 && <Cursor x={cx} y={cy} pressed={Math.max(0, 1 - Math.abs(f - ANSWER) / 4)} />}
        </div>
      ) : (
        <div style={{ transform: "rotateY(180deg)", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Label>Auto-graded</Label>
          <div style={{ fontSize: 220, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, marginTop: 20, transform: `scale(${score})` }}>
            8<span style={{ color: C.muted }}>/10</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: C.muted, marginTop: 16 }}>2:41 · better than 92% of players</div>
        </div>
      )}
    </div>
  );
};

const Leaderboard: React.FC = () => {
  const f = useCurrentFrame();
  const before = rankOf(1), after = rankOf(2);
  const k = ease(f, RESHUFFLE, RESHUFFLE + 20);
  return (
    <div style={{ width: 720, background: "#fff", border: `2px solid ${C.fg}`, boxShadow: `14px 14px 0 ${C.fg}`, padding: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 800, textTransform: "uppercase", marginBottom: 24 }}>
        <Trophy size={32} color="#f59e0b" /> Leaderboard
      </div>
      <div style={{ position: "relative", height: 5 * 96 }}>
        {PLAYERS.map(([name, p1, p2]) => {
          const y = interpolate(k, [0, 1], [before.indexOf(name), after.indexOf(name)]) * 96;
          const me = name === "You";
          const rank = (k > 0.5 ? after : before).indexOf(name) + 1;
          return (
            <div key={name} style={{ position: "absolute", left: 0, right: 0, top: y, height: 84, display: "flex", alignItems: "center", padding: "0 24px", gap: 20, fontSize: 28, fontWeight: 700, background: me ? C.primary : C.card, color: me ? "#fff" : C.fg, border: `2px solid ${me ? C.primary : C.border}`, zIndex: me ? 2 : 1, transform: me ? `scale(${1 + 0.05 * Math.sin(k * Math.PI)})` : undefined }}>
              <span style={{ fontFamily: MONO, width: 50 }}>#{rank}</span>
              <span style={{ flex: 1 }}>{name}</span>
              <span style={{ fontFamily: MONO }}>{Math.round(interpolate(k, [0, 1], [p1, p2]))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Quiz: React.FC = () => {
  const f = useCurrentFrame();
  const head = pop(f, 2, 16);
  const swap = ease(f, BOARD - 8, BOARD + 8);
  return (
    <Bg>
      <div style={{ position: "absolute", left: 190, top: 270, width: 760, opacity: head, transform: `translateY(${(1 - head) * 40}px)` }}>
        <Label>Quizzes</Label>
        <div style={{ marginTop: 22, fontSize: 92, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.92 }}>
          Auto-graded.<br /><span style={{ color: C.primary, fontStyle: "italic" }}>Live.</span>
        </div>
        <Caption style={{ marginTop: 40 }} items={[[8, "One shared timer for the whole room."], [BOARD, "Scores & leaderboard, instantly."]]} />
      </div>
      <div style={{ position: "absolute", left: 1040, top: 190, perspective: 2000 }}>
        {f < BOARD + 8 && <div style={{ opacity: 1 - swap, transform: `translateX(${-swap * 200}px)` }}><QuizCard /></div>}
        {f >= BOARD - 8 && <div style={{ position: "absolute", top: 40, left: 0, opacity: swap, transform: `translateX(${(1 - swap) * 200}px)` }}><Leaderboard /></div>}
      </div>
      <Confetti at={SCORE} x={1400} y={500} />
      <Confetti at={RESHUFFLE + 10} x={1400} y={420} />

      <Sfx s="click" at={ANSWER} />
      <Sfx s="correct" at={ANSWER + 1} v={0.9} />
      <Sfx s="swoosh" at={SCORE - 8} v={0.8} />
      <Sfx s="sparkle" at={SCORE} v={0.9} />
      <Sfx s="swoosh" at={BOARD - 8} v={0.8} />
      <Sfx s="swoosh" at={RESHUFFLE} v={0.9} />
      <Sfx s="positive" at={RESHUFFLE + 12} v={0.9} />
    </Bg>
  );
};
