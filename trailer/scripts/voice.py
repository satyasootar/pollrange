"""Render narration lines with Kokoro TTS → <out>/<id>.wav + a JSON of durations (for subtitles/ducking/pacing).

Setup once:  pip install kokoro-onnx soundfile
             download kokoro-v1.0.onnx + voices-v1.0.bin from
             https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 into trailer/.kokoro/
Run:         python scripts/voice.py                 trailer   (src/narration.json → public/voice, src/voice.json)
             python scripts/voice.py --walkthrough   walkthrough (walkthrough/script.json → public/wt-voice, src/walkthrough/voice.json)
             add --voice am_fenrir to try another voice (default am_michael)
"""
import argparse, json, re
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--walkthrough", action="store_true")
ap.add_argument("--voice", default="am_michael")
args = ap.parse_args()

if args.walkthrough:
    lines = json.loads((ROOT / "walkthrough/script.json").read_text(encoding="utf-8"))["beats"]
    out_dir, out_json = ROOT / "public/wt-voice", ROOT / "src/walkthrough/voice.json"
else:
    lines = json.loads((ROOT / "src/narration.json").read_text(encoding="utf-8"))
    out_dir, out_json = ROOT / "public/voice", ROOT / "src/voice.json"
out_dir.mkdir(parents=True, exist_ok=True)
out_json.parent.mkdir(parents=True, exist_ok=True)
kokoro = Kokoro(str(ROOT / ".kokoro/kokoro-v1.0.onnx"), str(ROOT / ".kokoro/voices-v1.0.bin"))


def spoken(line: dict) -> str:
    """The TTS reads "Kollects" wrong; say it like "Collects" unless the line spells out its own `say`."""
    if "say" in line:
        return line["say"]
    return re.sub(r"Kollects", "Collects", line["text"].replace("kollects.tech", "collects dot tech"))


def trim(x: np.ndarray, sr: int) -> np.ndarray:
    loud = np.where(np.abs(x) > 0.01)[0]
    if len(loud) == 0:
        return x
    pad = int(0.04 * sr)
    return x[max(0, loud[0] - pad): loud[-1] + pad]


result = []
for i, line in enumerate(lines):
    # Trailer lines have fixed start times: each must finish before the next (last before the 58s logo hit).
    # Walkthrough lines have no `at` — the recorder paces the footage to the voice instead.
    window = None
    if "at" in line:
        window = (lines[i + 1]["at"] if i + 1 < len(lines) else 58.0) - line["at"] - 0.15
    speed = 1.0
    while True:
        samples, sr = kokoro.create(spoken(line), voice=args.voice, speed=speed, lang="en-us")
        samples = trim(samples, sr)
        dur = len(samples) / sr
        if window is None or dur <= window or speed >= 1.3:
            break
        speed = round(speed + 0.05, 2)
    if window is not None and dur > window:
        print(f"WARNING {line['id']}: {dur:.2f}s > {window:.2f}s window even at speed {speed} — shorten the text")
    # Soft-knee limiter: ~+5 dB louder speech without clipping peaks.
    samples = np.tanh(1.8 * samples / np.max(np.abs(samples))) * 0.89
    sf.write(out_dir / f"{line['id']}.wav", samples, sr)
    result.append({k: line[k] for k in ("id", "at", "ch", "layout") if k in line} | {"text": line["text"], "dur": round(dur, 3)})
    print(f"{line['id']:9} {dur:5.2f}s" + (f" / {window:5.2f}s  speed {speed}" if window else ""))

out_json.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(f"total {sum(r['dur'] for r in result):.1f}s of narration")
