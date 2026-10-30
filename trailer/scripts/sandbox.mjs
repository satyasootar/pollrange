// Isolated demo stack for the walkthrough recording — runs NEXT TO the normal dev servers:
//   backend  :3031 → Mongo db `kollects_demo` (not the dev db), emails/uploads disabled, rate limits off
//   frontend :5174 → talks to :3031, share links display as kollects.tech
// Ctrl+C stops both.
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API = "http://localhost:3031/api";
const APP = "http://localhost:5174";

const root = fileURLToPath(new URL("../../", import.meta.url));
const logs = fileURLToPath(new URL("../recording/", import.meta.url));
mkdirSync(logs, { recursive: true });

function run(name, args, cwd, env) {
  const p = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env } });
  const log = createWriteStream(logs + `${name}.log`);
  p.stdout.pipe(log);
  p.stderr.pipe(log);
  p.on("exit", (code) => console.log(`${name} exited (${code}) — see recording/${name}.log`));
  return p;
}

const procs = [
  run("backend", ["dist/index.js"], root + "backend", {
    PORT: "3031",
    MONGODB_URI: "mongodb://localhost:27017/kollects_demo",
    ENVIRONMENT: "test", // disables rate limits; CORS/cookies stay in dev mode
    RESEND_API_KEY: "re_disabled",
    CLOUDINARY_CLOUD_NAME: "disabled",
    CLOUDINARY_API_KEY: "disabled",
    CLOUDINARY_API_SECRET: "disabled",
    ADMIN_EMAILS: "nobody@example.invalid", // demo user must not look like an admin
    CLIENT_URL: APP,
  }),
  run("frontend", ["node_modules/vite/bin/vite.js", "--port", "5174", "--strictPort"], root + "frontend", {
    VITE_ENV: "production", // only effect: read the API/socket URLs below instead of hard-coded :3030
    VITE_API_URL: API,
    VITE_SOCKET_URL: "http://localhost:3031",
    VITE_APP_URL: "https://kollects.tech",
    VITE_SITE_DOMAIN: "kollects.tech",
    VITE_ENABLE_AI: "false",
  }),
];

const up = async (url) => { for (;;) { try { await fetch(url); return; } catch { await new Promise((r) => setTimeout(r, 500)); } } };
await Promise.all([up(API), up(APP)]);
console.log(`sandbox ready: ${APP} → ${API}`);

const stop = () => { for (const p of procs) p.kill(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
