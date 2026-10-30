// Records the walkthrough footage from the REAL app (sandbox :5174) with Playwright.
//   node scripts/record.mjs             → recording/{admin,phone}.mp4 + recording/events.json
//   node scripts/record.mjs --rehearse  → no capture, short waits, screenshot per beat (locator check)
// Each beat runs its UI actions while its narration plays; the beat lasts max(actions, voice + gap),
// so footage and voice line up by construction. Every pointer action/zoom/callout is logged so the
// Remotion edit can draw the cursor, camera moves and highlights on top of the footage.
// Needs: sandbox running + fresh seed (`npm run wt:seed`).
import { chromium, devices } from "playwright";
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const APP = "http://localhost:5174";
const API = "http://localhost:3031/api";
const OUT = new URL("../recording/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const WT = new URL("../public/wt/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"); // footage for the Remotion edit
mkdirSync(WT, { recursive: true });
const REHEARSE = process.argv.includes("--rehearse");
const ONLY = process.argv.find((a) => a.startsWith("--from="))?.slice(7); // rehearse from a chapter onward
const VOICE = Object.fromEntries(JSON.parse(readFileSync(new URL("../src/walkthrough/voice.json", import.meta.url))).map((v) => [v.id, v.dur]));
const DEMO = { email: "demo@kollects.tech", password: "Demo@12345" };

const sleep = (ms) => new Promise((r) => setTimeout(r, REHEARSE ? Math.min(ms, 250) : ms));
const T0 = Date.now();
const now = () => (Date.now() - T0) / 1000;
const events = [];
mkdirSync(OUT, { recursive: true });
writeFileSync(OUT + "events.jsonl", ""); // streamed as we go, so a stall never loses the timeline
const log = (e) => {
  const ev = { t: +now().toFixed(3), ...e };
  events.push(ev);
  appendFileSync(OUT + "events.jsonl", JSON.stringify(ev) + "\n");
};

// ---------- browsers ----------
const browser = await chromium.launch();
const consent = { name: "kollects_consent", value: encodeURIComponent(JSON.stringify({ analytics: false, marketing: false, id: "demo", at: new Date().toISOString(), v: 2 })), domain: "localhost", path: "/" };
async function context(opts) {
  const ctx = await browser.newContext(opts);
  await ctx.addCookies([consent]);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP });
  return ctx;
}
const adminCtx = await context({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 });
const phoneCtx = await context({ ...devices["iPhone 13"], deviceScaleFactor: 2 }); // 390×664 → 780×1328 frames
const admin = await adminCtx.newPage();
const phone = await phoneCtx.newPage();
admin.on("dialog", (d) => d.accept()); // native confirm()s would otherwise be dismissed
phone.on("dialog", (d) => d.accept());
for (const [p, name] of [[admin, "admin"], [phone, "phone"]])
  p.on("framenavigated", (fr) => { if (fr === p.mainFrame()) log({ type: "url", page: name, url: fr.url() }); }); // incl. SPA pushState

// ---------- capture ----------
// CDP screencast frames are capped at CSS size (ignores DPR), so instead loop Page.captureScreenshot,
// which returns device pixels (admin 1920×1080, ~20fps). Frame times stream to frames.jsonl so a crash
// never loses them.
const caps = [];
async function capture(page, name, minGapMs) {
  const dir = `${OUT}frames-${name}/`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const vp = page.viewportSize(), dpr = await page.evaluate(() => devicePixelRatio);
  const clip = { x: 0, y: 0, width: vp.width, height: vp.height, scale: dpr }; // without scale, frames come back at CSS size
  let cdp = await page.context().newCDPSession(page);
  const cap = { name, dir, frames: [], running: true };
  // A screenshot can hang forever across a navigation; give up after 3s and reattach a fresh session.
  const shot = () => Promise.race([
    cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90, clip }), // clip.scale → device pixels
    new Promise((_, rej) => setTimeout(() => rej(new Error("screenshot timeout")), 3000)),
  ]);
  cap.done = (async () => {
    while (cap.running) {
      const started = Date.now();
      try {
        const { data } = await shot().catch(async (err) => {
          if (err.message === "screenshot timeout") {
            await cdp.detach().catch(() => {});
            cdp = await page.context().newCDPSession(page);
          }
          throw err;
        });
        const file = `${String(cap.frames.length).padStart(6, "0")}.jpg`;
        const frame = { t: +((started - T0) / 1000).toFixed(3), file };
        cap.frames.push(frame);
        writeFileSync(dir + file, Buffer.from(data, "base64"));
        appendFileSync(dir + "frames.jsonl", JSON.stringify(frame) + "\n");
      } catch { /* page mid-navigation: try again */ }
      const rest = minGapMs - (Date.now() - started);
      if (rest > 0) await new Promise((r) => setTimeout(r, rest));
    }
  })();
  cap.stop = async () => { cap.running = false; await cap.done; };
  caps.push(cap);
}

// ---------- director helpers (coords logged in CSS px of each page) ----------
const pos = new Map([[admin, { x: 800, y: 450 }], [phone, { x: 195, y: 400 }]]);
const pageName = (p) => (p === admin ? "admin" : "phone");
async function box(loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  if (!b) throw new Error("no box for " + loc);
  return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
}
async function move(page, loc) {
  const b = await box(loc);
  const from = pos.get(page), to = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const dur = Math.min(900, Math.max(320, dist * 0.7));
  log({ type: "move", page: pageName(page), x: to.x, y: to.y, dur: dur / 1000 });
  const steps = Math.max(1, Math.round(dur / 25));
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    await page.mouse.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
    if (!REHEARSE) await new Promise((r) => setTimeout(r, 25));
  }
  pos.set(page, to);
  return b;
}
async function click(page, loc) {
  const b = await move(page, loc);
  log({ type: "click", page: pageName(page), x: b.x + b.w / 2, y: b.y + b.h / 2 });
  await loc.click();
  await sleep(250);
}
async function tap(loc) {
  const b = await box(loc);
  log({ type: "tap", page: "phone", x: b.x + b.w / 2, y: b.y + b.h / 2 });
  await loc.tap();
  await sleep(300);
}
async function type(page, loc, text, { clear = false } = {}) {
  if (page === phone) await tap(loc); else await click(page, loc);
  if (clear) await loc.fill("");
  log({ type: "type", page: pageName(page), box: await box(loc), dur: (text.length * 55) / 1000 });
  await loc.pressSequentially(text, { delay: REHEARSE ? 0 : 55 });
  await sleep(200);
}
async function select(page, loc, label) {
  await click(page, loc);
  await loc.selectOption({ label });
  await sleep(300);
}
/** Camera: zoom the edit towards this element until unfocus(). */
async function focus(page, loc, zoom = 1.5) { log({ type: "focus", page: pageName(page), box: await box(loc), zoom }); }
const unfocus = (page = admin) => log({ type: "unfocus", page: pageName(page) });
/** Callout ring + label on an element for `dur` seconds. */
async function spot(page, loc, label, dur = 2.5) { log({ type: "spot", page: pageName(page), box: await box(loc), label, dur }); }
async function scrollTo(page, loc, block = "start") {
  await loc.evaluate((el, block) => el.scrollIntoView({ behavior: "smooth", block }), block);
  log({ type: "scroll", page: pageName(page) });
  await sleep(1100);
}
async function scrollBy(page, dy) {
  await page.mouse.wheel(0, 0); // keep hover sane
  await page.evaluate((dy) => {
    const el = [...document.querySelectorAll("main, [data-scroll], div")].find((d) => d.scrollHeight > d.clientHeight + 40 && getComputedStyle(d).overflowY.match(/auto|scroll/));
    (el ?? window).scrollBy({ top: dy, behavior: "smooth" });
  }, dy);
  log({ type: "scroll", page: pageName(page) });
  await sleep(1100);
}

let n = 0;
async function beat(id, actions) {
  if (VOICE[id] === undefined) throw new Error("no voice for beat " + id);
  const start = now();
  log({ type: "beat", id });
  log({ type: "url", page: "admin", url: admin.url() });
  try {
    await actions();
  } catch (err) {
    await admin.screenshot({ path: `${OUT}fail-${id}-admin.png` });
    await phone.screenshot({ path: `${OUT}fail-${id}-phone.png` });
    throw err;
  }
  if (REHEARSE) {
    await admin.screenshot({ path: `${OUT}r${String(++n).padStart(2, "0")}-${id}.png` });
    return;
  }
  const rest = start + VOICE[id] + 0.45 - now();
  if (rest > 0) await sleep(rest * 1000);
}
const chapter = (id) => log({ type: "chapter", id });
const respond = (path, body) => fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionToken: randomUUID(), ...body }) });
const localUrl = (shareUrl) => shareUrl.replace(/^https?:\/\/kollects\.tech/, APP);

// ================= warm-up (off camera) =================
await admin.goto(APP + "/");
await admin.waitForLoadState("networkidle");
// Park the phone on the app origin (blanked) — a later about:blank→app navigation swaps renderer
// processes and can hang screenshots mid-flight.
await phone.goto(APP + "/robots.txt");
await phone.evaluate(() => { document.documentElement.innerHTML = "<body style=\"background:#e7e5e4\"></body>"; });
if (!REHEARSE) {
  await capture(admin, "admin", 0);
  await capture(phone, "phone", 140); // phone is mostly still
}
log({ type: "start" });
await sleep(600);

const A = admin;
const sidebar = (name) => A.locator("aside, nav").getByText(name, { exact: true }).first();
let pollShare = "", formShare = "";
// Form-builder question type pickers (each question also has a hidden validation <select>).
const typeSelect = (i) => { const all = A.locator("select").filter({ has: A.locator("option", { hasText: "Paragraph" }) }); return i < 0 ? all.last() : all.nth(i); };

// ================= 1. Landing =================
chapter("landing");
await beat("l1", async () => {
  await sleep(1200);
  await spot(A, A.locator("h1").first(), "Capture the choice of your audience", 3);
});
await beat("l2", async () => {
  await sleep(600);
  await scrollBy(A, 620);
});
await beat("l3", async () => {
  await scrollTo(A, A.locator("#features"));
  await sleep(1500);
  await scrollBy(A, 280);
});
await beat("l4", async () => {
  await scrollTo(A, A.locator("#pricing"));
});
await beat("l5", async () => {
  await A.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1000);
  await click(A, A.getByRole("link", { name: "Sign In" }));
  await A.waitForURL("**/auth/login");
  await focus(A, A.locator("form").first(), 1.35);
  await type(A, A.locator("#email"), DEMO.email);
  await type(A, A.locator("#password"), DEMO.password);
  await click(A, A.getByRole("button", { name: "Sign in", exact: true }));
  unfocus();
  await A.waitForURL(/\/dashboard/);
});

// ================= 2. Overview =================
chapter("overview");
await beat("o1", async () => {
  if (!A.url().includes("/overview")) await click(A, sidebar("Overview"));
  await A.waitForURL("**/dashboard/overview");
  await A.waitForLoadState("networkidle");
});
await beat("o2", async () => {
  await spot(A, A.getByText("Total Responses", { exact: true }).first().locator("xpath=ancestor::*[contains(@class,'border')][1]"), "Every response, across polls & forms", 3);
});
await beat("o3", async () => {
  const chart = A.getByText("Responses over time").first();
  await focus(A, chart.locator("xpath=ancestor::*[contains(@class,'border')][1]"), 1.3);
  await click(A, A.getByRole("button", { name: "Week", exact: true }));
  await sleep(1400);
  await click(A, A.getByRole("button", { name: "Day", exact: true }));
  unfocus();
});
await beat("o4", async () => {
  await scrollTo(A, A.getByText("Top polls").first(), "center");
  await sleep(800);
  await spot(A, A.getByText("Top polls").first().locator("xpath=ancestor::*[contains(@class,'border')][1]"), "Your best performers", 2.5);
});

// ================= 3. Create a poll =================
chapter("poll");
await beat("p1", async () => {
  await click(A, sidebar("Polls"));
  await A.waitForURL(/\/dashboard$/);
  await A.waitForLoadState("networkidle");
});
await beat("p2", async () => {
  await click(A, A.getByRole("button", { name: /Create Poll/i }).first());
  await A.waitForURL("**/polls/create");
  await focus(A, A.locator("#title"), 1.4);
  await type(A, A.locator("#title"), "What should we build next?");
  await type(A, A.locator("#description"), "Help us pick our next big feature.");
  unfocus();
});
await beat("p3", async () => {
  const anon = A.getByRole("button", { name: /Anyone with the link can respond/i });
  await focus(A, anon, 1.35);
  await click(A, anon);
  await sleep(600);
  unfocus();
  await click(A, A.getByRole("button", { name: /Continue to Questions/i }));
});
await beat("p4", async () => {
  const q = A.getByPlaceholder("Type your question…").first();
  await focus(A, q, 1.35);
  await type(A, q, "Which feature would you use most?");
  await type(A, A.getByPlaceholder("Option 1").first(), "Live quizzes");
  await type(A, A.getByPlaceholder("Option 2").first(), "Dark mode");
  await click(A, A.getByRole("button", { name: "Add option" }).first());
  await type(A, A.getByPlaceholder("Option 3").first(), "Mobile app");
  unfocus();
});
await beat("p5", async () => {
  await click(A, A.getByRole("button", { name: "Add Question" }));
  const q2 = A.getByPlaceholder("Type your question…").nth(1);
  await focus(A, q2, 1.35);
  await select(A, A.locator("select").nth(1), "Open Ended");
  await type(A, q2, "Anything else you'd like to see?");
  unfocus();
});
await beat("p6", async () => {
  await click(A, A.getByRole("button", { name: /Review Poll/i }));
  await sleep(1500);
  await click(A, A.getByRole("button", { name: /Publish Poll/i }));
  await A.getByText("Poll Created Successfully!").waitFor();
});
await beat("p7", async () => {
  const input = A.locator("input[readonly]").first();
  pollShare = await input.inputValue();
  await focus(A, input, 1.4);
  await click(A, A.getByRole("button", { name: "Copy", exact: true }));
  await sleep(1200);
  unfocus();
});

// ================= 4. Live results =================
chapter("live");
await beat("v1", async () => {
  await click(A, A.getByRole("button", { name: /View Analytics/i }));
  await A.waitForURL(/\/polls\/.+\/analytics/);
  await A.getByText("Live", { exact: true }).first().waitFor();
  await sleep(500);
  await spot(A, A.getByText("Live", { exact: true }).first(), "Updates in real time", 3);
});
await beat("v2", async () => {
  log({ type: "url", page: "phone", url: pollShare });
  await phone.goto(localUrl(pollShare));
  await phone.waitForLoadState("networkidle");
});
await beat("v3", async () => {
  await tap(phone.getByRole("button", { name: "Live quizzes" }));
  await type(phone, phone.getByPlaceholder("Your answer…"), "QR codes for events please!");
  await tap(phone.getByRole("button", { name: "Submit Response" }));
  await phone.getByText("Thank you!").waitFor();
});
await beat("v4", async () => {
  await spot(A, A.getByText("Total Responses", { exact: true }).first().locator("xpath=ancestor::*[contains(@class,'border')][1]"), "+1, instantly", 3);
});
await beat("v5", async () => {
  const poll = await (await fetch(`${API}/public/polls/${pollShare.split("/p/")[1]}`)).json();
  const [q1, q2] = poll.data.questions;
  const words = ["dark mode for night owls", "mobile app", "faster live quizzes"];
  for (let i = 0; i < 3; i++) {
    await respond(`/responses/${poll.data._id}`, { answers: [
      { questionId: q1._id, selectedOptionId: q1.options[[0, 2, 0][i]]._id, skipped: false },
      { questionId: q2._id, textResponse: words[i], skipped: false },
    ] });
    await sleep(1300);
  }
  await scrollBy(A, 500);
});
await beat("v6", async () => {
  await A.evaluate(() => window.scrollTo({ top: 0 }));
  await click(A, A.getByRole("button", { name: /Publish Results/i }).locator("xpath=following::button[1]"));
  await click(A, A.getByRole("menuitem", { name: /QR Code/i }));
  await sleep(2500);
  await A.keyboard.press("Escape");
});
await beat("v7", async () => {
  await click(A, A.getByRole("button", { name: /Publish Results/i }));
  await click(A, A.getByRole("menuitem", { name: /Publish Live/i }));
  await sleep(1200);
});

// ================= 5. Forms section =================
chapter("forms");
await beat("f1", async () => {
  await click(A, sidebar("Forms"));
  await A.waitForURL("**/dashboard/forms");
  await A.waitForLoadState("networkidle");
});
await beat("f2", async () => {
  await click(A, A.getByText("Workshop Feedback").first());
  await A.waitForURL(/\/forms\/.+\/analytics/);
  await A.waitForLoadState("networkidle");
});
await beat("f3", async () => {
  await sleep(800);
  await scrollBy(A, 600);
  await sleep(800);
  await scrollBy(A, 600);
});
await beat("f4", async () => {
  await A.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await click(A, A.getByRole("tab", { name: "Individual" }));
});
await beat("f5", async () => {
  await click(A, A.getByRole("tab", { name: "Table" }));
  await sleep(1200);
  await click(A, A.getByRole("button", { name: "More actions" }));
  await spot(A, A.getByRole("menuitem", { name: /Export CSV/i }), "One-click CSV export", 2.2);
  await sleep(2200);
  await A.keyboard.press("Escape");
});
await beat("f6", async () => {
  await click(A, sidebar("Forms"));
  await click(A, A.getByText("GK Quiz — Science Week").first());
  await A.waitForURL(/\/forms\/.+\/analytics/);
  await click(A, A.getByRole("tab", { name: "Leaderboard" }));
});

// ================= 6. Build a form =================
chapter("form");
await beat("c1", async () => {
  await click(A, sidebar("Forms"));
  await click(A, A.getByRole("button", { name: /Create Form/i }).first());
  await A.waitForURL("**/forms/create");
});
await beat("c2", async () => {
  await focus(A, A.locator("#title"), 1.35);
  await type(A, A.locator("#title"), "Tech Fest 2026 Registration");
  await type(A, A.locator("#description"), "Register for events. Pay by UPI after you submit.");
  await type(A, A.locator("#slug"), "techfest");
  await sleep(800);
  unfocus();
});
await beat("c3", async () => {
  await click(A, A.getByRole("button", { name: /Continue to Questions/i }));
  const t1 = A.getByPlaceholder("Question title…").first();
  await focus(A, t1, 1.35);
  await select(A, typeSelect(0), "Short answer");
  await type(A, t1, "Your full name");
  unfocus();
});
await beat("c4", async () => {
  await click(A, A.getByRole("button", { name: /Add question/i }).first());
  const t2 = A.getByPlaceholder("Question title…").nth(1);
  await focus(A, t2, 1.3);
  await select(A, typeSelect(1), "Multiple choice (checkboxes)");
  await type(A, t2, "Which events will you join?");
  await type(A, A.getByPlaceholder("Option 1").last(), "Hackathon", { clear: true });
  await click(A, A.getByRole("button", { name: "Add option" }).last());
  await type(A, A.getByPlaceholder("Option 2").last(), "Robo Race", { clear: true });
  await click(A, A.getByRole("button", { name: "Add option" }).last());
  await type(A, A.getByPlaceholder("Option 3").last(), "Gaming Arena", { clear: true });
  unfocus();
});
await beat("c5", async () => {
  const toggle = A.getByText("Collect payment via UPI").last();
  await focus(A, toggle, 1.3);
  await click(A, toggle);
  await type(A, A.getByPlaceholder("yourname@okaxis").last(), "techfest@okaxis");
  await type(A, A.getByLabel("Price for Hackathon"), "299");
  await type(A, A.getByLabel("Price for Robo Race"), "199");
  await type(A, A.getByLabel("Price for Gaming Arena"), "149");
  unfocus();
});
await beat("c6", async () => {
  await click(A, A.getByRole("button", { name: /Add section/i }));
  await sleep(600);
  const t3 = A.getByPlaceholder("Question title…").last();
  await focus(A, t3, 1.3);
  await select(A, typeSelect(-1), "Rating");
  await type(A, t3, "How excited are you?");
  unfocus();
});
await beat("c7", async () => {
  await click(A, A.getByRole("button", { name: /Review Form/i }));
  await sleep(1200);
  await click(A, A.getByRole("button", { name: /Publish Form/i }));
  await A.getByText("Form Created!").waitFor();
  const input = A.locator("input[readonly]").first();
  formShare = await input.inputValue();
  await click(A, A.getByRole("button", { name: "Copy", exact: true }));
  await sleep(600);
  await click(A, A.getByRole("button", { name: /View Responses/i }));
});

// ================= 7. UPI =================
chapter("upi");
await beat("u1", async () => {
  log({ type: "url", page: "phone", url: formShare });
  await phone.goto(localUrl(formShare));
  await phone.waitForLoadState("networkidle");
  await type(phone, phone.getByRole("textbox").first(), "Rohan Mehta");
  await tap(phone.getByRole("button", { name: /Hackathon/ }));
  await tap(phone.getByRole("button", { name: /Robo Race/ }));
  await sleep(800);
});
await beat("u2", async () => {
  await tap(phone.getByRole("button", { name: /Next/ }));
  await sleep(600);
  await tap(phone.locator("button:has(svg.lucide-star)").nth(4)); // 5 stars
  await tap(phone.getByRole("button", { name: /^Submit/ }));
  await phone.getByText("Complete your payment").waitFor();
});
await beat("u3", async () => {
  await sleep(500);
  await spot(phone, phone.getByLabel("UPI payment QR code"), "Standard UPI QR", 3);
});
await beat("u4", async () => {
  await sleep(2500);
  await phone.evaluate(() => window.scrollBy({ top: 320, behavior: "smooth" }));
  log({ type: "scroll", page: "phone" });
});
await beat("u5", async () => {
  await sleep(500);
});
await beat("u6", async () => {
  await click(A, A.getByRole("tab", { name: "Individual" }));
  await sleep(1000);
  await spot(A, A.getByText(/₹\s?498/).first(), "Amount due + payment note", 3.5);
});

// ================= 8. Brand kit =================
chapter("brand");
await beat("b1", async () => {
  await click(A, A.locator("aside").getByRole("button").last());
  await click(A, A.getByRole("menuitem", { name: "Brand kit" }));
  await A.waitForURL("**/dashboard/branding");
});
await beat("b2", async () => {
  await type(A, A.locator("#companyName"), "TechFest IIT");
  await click(A, A.getByLabel(/Accent #/).nth(3));
  await select(A, A.locator("#font"), "Poppins");
  await click(A, A.getByRole("radio", { name: "Round" }));
});
await beat("b3", async () => {
  await click(A, A.getByRole("tab", { name: "QR code" }));
  await sleep(1800);
  await click(A, A.getByRole("tab", { name: "Link preview" }));
  await sleep(1800);
  await click(A, A.getByRole("tab", { name: "Form" }));
});
await beat("b4", async () => {
  await click(A, A.getByRole("button", { name: "Save", exact: true }));
  await sleep(1500);
});

chapter("outro");
await beat("e1", async () => {});
log({ type: "end" });

// ================= encode =================
const end = now();
for (const cap of caps) await Promise.race([cap.stop(), new Promise((r) => setTimeout(r, 5000))]);
await browser.close();
writeFileSync(OUT + "events.json", JSON.stringify({ duration: end, admin: { w: 1600, h: 900, scale: 1.2 }, phone: { w: 390, h: 664 }, events }, null, 1));
for (const cap of caps) {
  const list = cap.frames.map((f, i) => `file '${cap.dir}${f.file}'\nduration ${((cap.frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`);
  // concat demuxer: hold the first frame from t=0 so the clip lines up with the recording timeline
  list.unshift(`file '${cap.dir}${cap.frames[0].file}'\nduration ${cap.frames[0].t.toFixed(4)}`);
  writeFileSync(cap.dir + "list.txt", list.join("\n") + `\nfile '${cap.dir}${cap.frames.at(-1).file}'\n`);
  // Remotion's bundled ffmpeg has no fps/scale filters → constant 30fps via output options; frames are already even-sized.
  execFileSync("npx", ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", cap.dir + "list.txt",
    "-fps_mode", "cfr", "-r", "30", "-g", "30", "-video_track_timescale", "30000", "-pix_fmt", "yuv420p", /* regular keyframes + clean timebase so Remotion seeks reliably */ "-c:v", "libx264", "-crf", "16", "-preset", "medium", `${WT}${cap.name}.mp4`], { stdio: "inherit", shell: true });
  console.log(`${cap.name}.mp4 ← ${cap.frames.length} frames (${(cap.frames.length / end).toFixed(1)} fps)`);
}
console.log(`done: ${now().toFixed(1)}s, ${events.length} events`);
