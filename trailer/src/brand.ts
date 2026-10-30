import { Easing, continueRender, delayRender, interpolate, spring } from "remotion";
// Fonts are bundled from npm (@fontsource, same as the frontend) so renders work offline.
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "@fontsource-variable/plus-jakarta-sans/wght-italic.css";
import "@fontsource/roboto-mono/400.css";
import "@fontsource/roboto-mono/500.css";
import "@fontsource/roboto-mono/700.css";
import "@fontsource/lora/700.css";

// Values copied from frontend/src/index.css so the trailer matches the product.
export const C = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  logoBar: "#7584f6",
  ramp: ["#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81"],
  bg: "#e7e5e4",
  card: "#f5f5f4",
  fg: "#1e293b",
  border: "#d6d3d1",
  muted: "#6b7280",
  dark: "#1e1b18",
  darkCard: "#2c2825",
  darkBorder: "#3a3633",
  ink: "#2b2622",
  red: "#ef4444",
  green: "#16a34a",
};

export const SANS = "'Plus Jakarta Sans Variable', sans-serif";
export const MONO = "'Roboto Mono', monospace";
export const SERIF = "'Lora', serif";

// @font-face loads lazily; hold the first frame until every face we use is ready (no fallback flash).
const fontsReady = delayRender("Loading bundled fonts");
Promise.all(
  ["400 1em", "500 1em", "700 1em", "800 1em", "italic 800 1em"].map((w) => document.fonts.load(`${w} 'Plus Jakarta Sans Variable'`))
    .concat(["400", "500", "700"].map((w) => document.fonts.load(`${w} 1em 'Roboto Mono'`)), document.fonts.load("700 1em 'Lora'")),
).then(() => continueRender(fontsReady));

export const FPS = 30;
export const BEAT = 15; // 120 BPM

const EASE = Easing.bezier(0.22, 1, 0.36, 1); // same curve as frontend fadeUp

/** Clamped eased interpolation of frame f over [from, to]. */
export const ease = (f: number, from: number, to: number, out: [number, number] = [0, 1]) =>
  interpolate(f, [from, to], out, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

/** Spring starting at `delay`. Lower damping = bouncier. */
export const pop = (f: number, delay: number, damping = 13) =>
  spring({ frame: f - delay, fps: FPS, config: { damping, stiffness: 170, mass: 0.7 } });
