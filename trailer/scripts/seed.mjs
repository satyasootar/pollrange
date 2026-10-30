// Seeds the walkthrough sandbox (db `kollects_demo`, API :3031) with a Pro demo creator and ~30 days of
// realistic polls/forms/responses. Everything goes through the real API (valid schemas + denormalised
// counters), then submittedAt/createdAt are backdated so the Overview charts have history.
// Re-runnable: drops kollects_demo first. Requires `npm run wt:sandbox` running.
import { createRequire } from "node:module";
import { randomBytes, randomUUID } from "node:crypto";

const API = "http://localhost:3031/api";
const DB = "mongodb://localhost:27017/kollects_demo";
export const DEMO = { name: "Aanya Sharma", email: "demo@kollects.tech", password: "Demo@12345" };

const mongoose = createRequire(new URL("../../backend/package.json", import.meta.url))("mongoose");
await mongoose.connect(DB);
const db = mongoose.connection.db;
if (db.databaseName !== "kollects_demo") throw new Error("refusing to touch " + db.databaseName);
await db.dropDatabase();

let token = "";
async function api(method, path, body, auth = true) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json.data;
}

// Respondents are anonymous visitors — never send the creator token with a response.
const anon = (path, body) => api("POST", path, body, false);

// ---------- helpers ----------
const hex = () => randomBytes(12).toString("hex"); // client-side 24-hex ids, as the builder does
const pick = (weights) => { let r = Math.random() * weights.reduce((a, b) => a + b, 0); return weights.findIndex((w) => (r -= w) < 0); };
const pickN = (weights, min, max) => {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const out = new Set(); while (out.size < n) out.add(pick(weights)); return [...out];
};
const opts = (texts, amounts) => texts.map((text, order) => ({ _id: hex(), text, order, ...(amounts ? { amount: amounts[order] } : {}) }));

// ---------- creator ----------
await api("POST", "/auth/register", DEMO);
await db.collection("users").updateOne(
  { email: DEMO.email },
  { $set: { "plan.id": "pro", isEmailVerified: true, hasCompletedOnboarding: true, createdAt: new Date(Date.now() - 40 * 864e5) } },
);
token = (await api("POST", "/auth/login", { email: DEMO.email, password: DEMO.password })).accessToken;

// ---------- polls ----------
const POLLS = [
  { title: "Which feature should we build next?", n: 184, mode: "active",
    q: [{ text: "Pick the one you'd use most", type: "single_choice", o: ["Live quizzes", "Dark mode", "Mobile app", "Slack integration"], w: [44, 22, 21, 13] },
        { text: "Anything else we should know?", type: "open_ended", words: ["faster exports please", "love the live charts", "simple and fast", "dark mode would be great", "more templates", "easy to share", "QR codes are handy"] }] },
  { title: "Best session at DevConf 2026", n: 126, mode: "active",
    q: [{ text: "Which talk did you enjoy most?", type: "single_choice", o: ["Scaling Postgres", "Rust for web devs", "Design systems", "AI in production"], w: [24, 31, 18, 27] }] },
  { title: "Team offsite — where should we go?", n: 64, mode: "closed",
    q: [{ text: "Vote for the destination", type: "single_choice", o: ["Goa", "Manali", "Coorg", "Jaipur"], w: [38, 27, 21, 14] }] },
  { title: "Friday lunch vote", n: 42, mode: "published",
    q: [{ text: "What should we order?", type: "multiple_choice", o: ["Pizza", "Biryani", "Dosa", "Salad bowls"], w: [30, 40, 22, 8] }] },
  { title: "Q4 planning priorities", n: 0, mode: "draft",
    q: [{ text: "What matters most next quarter?", type: "single_choice", o: ["Growth", "Retention", "Reliability"], w: [1, 1, 1] }] },
];

for (const p of POLLS) {
  const poll = await api("POST", "/polls", {
    title: p.title, responseMode: "anonymous",
    questions: p.q.map((q, order) => ({ text: q.text, type: q.type, order, isMandatory: q.type !== "open_ended",
      ...(q.o ? { options: q.o.map((text, i) => ({ text, order: i })) } : {}) })),
  });
  for (let i = 0; i < p.n; i++) {
    await anon(`/responses/${poll._id}`, {
      sessionToken: randomUUID(),
      answers: poll.questions.map((pq, k) => {
        const q = p.q[k];
        if (q.type === "open_ended") {
          const say = Math.random() < 0.55;
          return { questionId: pq._id, textResponse: say ? q.words[Math.floor(Math.random() * q.words.length)] : null, skipped: !say };
        }
        if (q.type === "multiple_choice") return { questionId: pq._id, selectedOptionIds: pickN(q.w, 1, 2).map((j) => pq.options[j]._id), skipped: false };
        return { questionId: pq._id, selectedOptionId: pq.options[pick(q.w)]._id, skipped: false };
      }),
    });
  }
  if (p.mode === "closed") await api("PATCH", `/polls/${poll._id}/close`, {});
  if (p.mode === "published") await api("POST", `/polls/${poll._id}/publish`, { mode: "permanent" });
  if (p.mode === "draft") await db.collection("polls").updateOne({ _id: new mongoose.Types.ObjectId(poll._id) }, { $set: { status: "draft" } });
  console.log(`poll  ${p.title} (${p.n})`);
}

// ---------- forms ----------
const fb = {
  rating: { _id: hex(), order: 0, type: "rating", title: "How would you rate the workshop?", isRequired: true, scaleMin: 1, scaleMax: 5 },
  nps: { _id: hex(), order: 1, type: "linear_scale", title: "How likely are you to recommend it to a friend?", isRequired: true, scaleMin: 0, scaleMax: 10, scaleMinLabel: "Not likely", scaleMaxLabel: "Very likely" },
  heard: { _id: hex(), order: 2, type: "multiple_choice", title: "How did you hear about us?", isRequired: true, options: opts(["Instagram", "A friend", "College notice board", "LinkedIn"]) },
  liked: { _id: hex(), order: 3, type: "paragraph", title: "What did you like most?", isRequired: false },
};
const quizQs = [
  ["Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Saturn"], 1],
  ["What is H₂O commonly called?", ["Salt", "Hydrogen", "Water", "Oxygen"], 2],
  ["Who proposed the theory of relativity?", ["Newton", "Einstein", "Tesla", "Bohr"], 1],
  ["How many bones are in the adult human body?", ["206", "212", "198", "250"], 0],
  ["Which gas do plants absorb?", ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"], 2],
].map(([title, o, correct], order) => {
  const options = opts(o);
  return { _id: hex(), order, type: "multiple_choice", title, isRequired: true, points: 2, options, answerKey: { correctOptionIds: [options[correct]._id] } };
});
const vol = {
  roles: { _id: hex(), order: 0, type: "checkboxes", title: "Which roles can you help with?", isRequired: true, options: opts(["Registration desk", "Stage crew", "Hospitality", "Photography"]) },
  size: { _id: hex(), order: 1, type: "dropdown", title: "T-shirt size", isRequired: true, options: opts(["S", "M", "L", "XL"]) },
};

const FORMS = [
  { n: 142, body: { title: "Workshop Feedback", description: "Tell us how the session went.", responseMode: "anonymous",
      sections: [{ _id: hex(), order: 0, questions: Object.values(fb) }] },
    answer: () => [
      { questionId: fb.rating._id, scaleValue: [3, 4, 4, 5, 5, 5][Math.floor(Math.random() * 6)] },
      { questionId: fb.nps._id, scaleValue: [6, 7, 8, 8, 9, 9, 10, 10][Math.floor(Math.random() * 8)] },
      { questionId: fb.heard._id, selectedOptionIds: [fb.heard.options[pick([34, 28, 22, 16])]._id] },
      ...(Math.random() < 0.6 ? [{ questionId: fb.liked._id, textValue: ["The hands-on exercises", "Clear explanations", "Great pace and examples", "Live Q&A at the end", "Friendly speakers"][Math.floor(Math.random() * 5)] }] : []),
    ] },
  { n: 64, quiz: true, body: { title: "GK Quiz — Science Week", description: "5 quick questions. 2 points each.", responseMode: "anonymous", isQuiz: true,
      sections: [{ _id: hex(), order: 0, questions: quizQs }] },
    answer: () => quizQs.map((q) => ({ questionId: q._id, selectedOptionIds: [q.options[Math.random() < 0.72 ? q.options.findIndex((o) => o._id === q.answerKey.correctOptionIds[0]) : Math.floor(Math.random() * 4)]._id] })) },
  { n: 38, body: { title: "Hackathon Volunteer Sign-up", responseMode: "anonymous", sections: [{ _id: hex(), order: 0, questions: Object.values(vol) }] },
    answer: () => [
      { questionId: vol.roles._id, selectedOptionIds: pickN([3, 2, 2, 1], 1, 2).map((j) => vol.roles.options[j]._id) },
      { questionId: vol.size._id, selectedOptionIds: [vol.size.options[pick([2, 4, 3, 1])]._id] },
    ] },
];
const NAMES = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Isha", "Kabir", "Meera", "Arjun", "Diya", "Kunal", "Sneha", "Rahul", "Tara", "Neel", "Zoya"];

for (const f of FORMS) {
  const form = await api("POST", "/forms", f.body);
  for (let i = 0; i < f.n; i++) {
    const sessionToken = randomUUID();
    if (f.quiz) await anon(`/form-responses/${form._id}/attempt`, { sessionToken }); // same as pressing Start
    await anon(`/form-responses/${form._id}`, {
      sessionToken,
      ...(f.quiz ? { respondentName: `${NAMES[i % NAMES.length]} ${String.fromCharCode(65 + (i * 7) % 26)}.` } : {}),
      answers: f.answer(),
    });
  }
  console.log(`form  ${f.body.title} (${f.n})`);
}

// ---------- backdate history (timeline charts use submittedAt) ----------
const now = Date.now();
const ago = () => now - Math.pow(Math.random(), 1.6) * 28 * 864e5 - 30 * 60e3; // denser towards today
for (const [kids, parents, key] of [["responses", "polls", "pollId"], ["formresponses", "forms", "formId"]]) {
  for (const parent of await db.collection(parents).find().toArray()) {
    await db.collection(parents).updateOne({ _id: parent._id }, { $set: { createdAt: new Date(now - (30 + Math.random() * 6) * 864e5) } });
    const ops = (await db.collection(kids).find({ [key]: parent._id }, { projection: { _id: 1 } }).toArray())
      .map((r) => { const d = new Date(ago()); return { updateOne: { filter: { _id: r._id }, update: { $set: { submittedAt: d, createdAt: d } } } }; });
    if (ops.length) await db.collection(kids).bulkWrite(ops);
  }
}
console.log("seeded ✓ login:", DEMO.email, DEMO.password);
await mongoose.disconnect();
