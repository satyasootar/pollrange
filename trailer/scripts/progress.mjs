// Live progress view for the walkthrough recording: http://localhost:5199
// Reads the recorder's streamed logs (events.jsonl, frames-*/frames.jsonl) — no coupling to the
// recorder process, so it can be started/stopped at any time.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const file = (p) => new URL(p, ROOT);
const PORT = 5199;
const BEATS = JSON.parse(readFileSync(file("src/walkthrough/voice.json"), "utf8"));
const CHAPTERS = JSON.parse(readFileSync(file("walkthrough/script.json"), "utf8")).chapters;
const EXPECTED = BEATS.reduce((a, b) => a + b.dur + 0.45, 0) + 25; // narration + actions ≈ recording length

const lines = (p) => (existsSync(file(p)) ? readFileSync(file(p), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const mtime = (p) => (existsSync(file(p)) ? statSync(file(p)).mtimeMs : 0);

function status() {
  const events = lines("recording/events.jsonl");
  const started = existsSync(file("recording/events.jsonl")) ? statSync(file("recording/events.jsonl")).birthtimeMs : 0;
  const beats = events.filter((e) => e.type === "beat");
  const last = beats.at(-1);
  const beat = BEATS.find((b) => b.id === last?.id);
  const ended = events.some((e) => e.type === "end");
  const caps = Object.fromEntries(["admin", "phone"].map((n) => {
    const fr = lines(`recording/frames-${n}/frames.jsonl`);
    const t = events.at(-1)?.t ?? 0;
    const recent = fr.filter((f) => f.t > t - 5).length / 5;
    return [n, { frames: fr.length, fps: +recent.toFixed(1), last: fr.at(-1)?.file ?? null, ageSec: Math.round((Date.now() - mtime(`recording/frames-${n}/frames.jsonl`)) / 1000) }];
  }));
  const mp4 = Math.min(mtime("public/wt/admin.mp4"), mtime("public/wt/phone.mp4"));
  const encoded = ended && mp4 > started;
  const elapsed = events.at(-1)?.t ?? 0;
  let stage = "waiting for the recorder to start";
  if (events.length) stage = ended ? (encoded ? "done — footage encoded" : "encoding footage…") : "recording";
  const stalled = stage === "recording" && caps.admin.ageSec > 12;
  // Final video render (npm run wt:render > recording/render.log): last "done/total" pair in the log.
  const log = existsSync(file("recording/render.log")) ? readFileSync(file("recording/render.log"), "utf8") : "";
  const r = [...log.matchAll(/(\d+)\/(\d+)/g)].at(-1);
  const render = log ? { done: r ? +r[1] : 0, total: r ? +r[2] : 0, finished: /^exit 0$/m.test(log) /* render command appends its exit code */, ageSec: Math.round((Date.now() - mtime("recording/render.log")) / 1000), tail: log.trim().split(/\r?\n|\r/).at(-1)?.slice(0, 160) ?? "" } : null;
  return {
    render,
    stage, stalled, elapsed, expected: Math.round(EXPECTED),
    beatIndex: last ? BEATS.findIndex((b) => b.id === last.id) + 1 : 0, beatTotal: BEATS.length,
    chapter: CHAPTERS.find((c) => c.id === beat?.ch)?.title ?? (beat?.ch === "outro" ? "Outro" : "—"),
    narration: beat?.text ?? "", actions: events.slice(-6).reverse().map((e) => `${e.t.toFixed(1)}s  ${e.type}${e.label ? " · " + e.label : e.id ? " · " + e.id : ""}`),
    caps,
  };
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Walkthrough recording</title>
<style>
:root{--bg:#e7e5e4;--fg:#1e293b;--muted:#6b7280;--primary:#6366f1;--card:#f5f5f4;--red:#ef4444;--green:#16a34a}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;padding:24px}
h1{margin:0 0 4px;font-size:22px;letter-spacing:-.02em}.muted{color:var(--muted)}
.row{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-top:18px}
.card{background:var(--card);border:2px solid var(--fg);box-shadow:6px 6px 0 var(--fg);padding:16px}
.bar{height:10px;background:#0001;margin:8px 0 4px}.bar>div{height:100%;background:var(--primary);transition:width .5s}
.pill{display:inline-block;padding:3px 10px;font:600 12px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;border:1.5px solid}
.ok{color:var(--green)}.bad{color:var(--red)}.run{color:var(--primary)}
img{display:block;border:1px solid #0002;background:#fff}
pre{margin:0;font:12px/1.6 ui-monospace,monospace}
</style></head><body>
<h1>Kollects walkthrough — recording</h1><div class="muted">Refreshes every second · footage frames are the real captured images</div>
<div class="card" style="margin-top:16px;max-width:1280px">
 <span id="stage" class="pill run">…</span> <b id="chapter"></b> <span class="muted" id="beat"></span>
 <div class="bar"><div id="prog" style="width:0"></div></div>
 <div class="muted" id="time"></div>
 <div style="margin-top:8px">🎙 <i id="narr"></i></div>
</div>
<div class="card" id="rcard" style="margin-top:16px;max-width:1280px;display:none">
 <span id="rstage" class="pill run">rendering</span> <b>Final video render</b> <span class="muted" id="rcount"></span>
 <div class="bar"><div id="rprog" style="width:0"></div></div>
 <pre class="muted" id="rtail"></pre>
</div>
<div class="row">
 <div class="card"><b>Admin browser</b> <span class="muted" id="ca"></span><img id="ia" width="800" height="450" alt=""></div>
 <div class="card"><b>Respondent phone</b> <span class="muted" id="cp"></span><img id="ip" width="234" height="398" alt=""></div>
 <div class="card"><b>Latest actions</b><pre id="acts"></pre></div>
</div>
<script>
const $=id=>document.getElementById(id);
async function tick(){
  try{
    const s=await (await fetch('/status')).json();
    const st=$('stage');st.textContent=s.stalled?'stalled?':s.stage;st.className='pill '+(s.stalled?'bad':s.stage.startsWith('done')?'ok':'run');
    $('chapter').textContent=s.chapter;$('beat').textContent=s.beatIndex?'· beat '+s.beatIndex+' of '+s.beatTotal:'';
    $('prog').style.width=Math.min(100,(s.beatIndex/s.beatTotal)*100)+'%';
    $('time').textContent=Math.floor(s.elapsed/60)+'m '+Math.round(s.elapsed%60)+'s recorded of ~'+Math.round(s.expected/60)+' min'+(s.stalled?' — admin frames not updating for '+s.caps.admin.ageSec+'s':'');
    $('narr').textContent=s.narration;
    for(const [k,el,c] of [['admin','ia','ca'],['phone','ip','cp']]){const x=s.caps[k];$(c).textContent=x.frames+' frames · '+x.fps+' fps'+(x.frames?' · last '+x.ageSec+'s ago':'');if(x.last)$(el).src='/frame/'+k+'/'+x.last;}
    $('acts').textContent=s.actions.join('\\n');
    if(s.render){const r=s.render;$('rcard').style.display='';const st=$('rstage');
      st.textContent=r.finished?'done':r.ageSec>60?'stalled?':'rendering';st.className='pill '+(r.finished?'ok':r.ageSec>60?'bad':'run');
      $('rcount').textContent=r.total?r.done+' / '+r.total+' frames':'starting…';$('rprog').style.width=(r.total?r.done/r.total*100:0)+'%';$('rtail').textContent=r.tail;}
  }catch(e){$('stage').textContent='progress server offline';}
}
tick();setInterval(tick,1000);
</script></body></html>`;

createServer((req, res) => {
  if (req.url === "/status") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(status())); }
  const m = req.url.match(/^\/frame\/(admin|phone)\/(\d{6}\.jpg)$/);
  if (m) {
    const p = file(`recording/frames-${m[1]}/${m[2]}`);
    if (!existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": "image/jpeg", "cache-control": "max-age=3600" });
    return res.end(readFileSync(p));
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(PAGE);
}).listen(PORT, () => console.log(`progress view: http://localhost:${PORT}`));
