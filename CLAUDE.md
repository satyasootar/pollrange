# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Structure

Two independent npm packages, no root `package.json` and no workspaces — run commands from inside each folder:
- `backend/` — Express 5 + MongoDB (Mongoose) + Socket.io, ESM TypeScript, Node ≥24.
- `frontend/` — React 19 + Vite SPA, TypeScript, TailwindCSS 4, shadcn/radix.

## Commands

Backend (`cd backend`):
- `npm run dev` — tsc-watch + runs `dist/index.js` on rebuild (serves :3030)
- `npm run build` — `tsc`; `npm start` — run compiled output

Frontend (`cd frontend`):
- `npm run dev` — Vite (:5173)
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — eslint; `npm run typecheck` — `tsc --noEmit`; `npm run format` — prettier

There is **no test framework** in either package. Quality gates are frontend `lint` + `typecheck`.

## Backend architecture

- Feature-module convention: each feature is `*.route.ts → *.controller.ts → *.service.ts → *.model.ts + *.validation.ts` (Zod) under `backend/src/modules/*` (auth, poll, response, analytics; model-only: user, session, notification, analytics-snapshot).
- App assembly: `backend/src/index.ts` (HTTP server + Socket.io) → `backend/src/app/index.ts` (middleware, passport, `/api` router) → `backend/src/routes/index.ts` (mounts `/api/{auth,polls,public/polls,responses,analytics}`).
- ESM with NodeNext: **imports use `.js` specifiers** even for `.ts` files. tsconfig is strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- Data model: `Poll` embeds `questions[] → options[]` with **denormalized** `voteCount` and `totalResponses` on the poll doc; responses stored separately in `response.model.ts`.
- Auth: JWT access token (cookie `accessToken` or `Bearer`) via `verifyJWT` in `middlewares/auth.middleware.ts`; refresh-token flow; bcrypt passwords; Google OAuth in `config/passport.ts`. Standardized `ApiError`/`ApiResponse` utils; Resend for email.
- Background job: `jobs/expiry.job.ts` — in-process `setInterval` (60s) closing expired polls (single-instance assumption, no distributed lock).

## Frontend architecture

- Routing (`src/App.tsx`, react-router v7): public marketing `/`, `/auth/*` (GuestRoute), public poll taking `/p/:shareToken`(+`/results`), protected creator area (`ProtectedRoute → AppShell`) for `/dashboard`, `/polls/create`, `/polls/:pollId/{edit,analytics}`.
- Two state layers: **server state** via TanStack Query (`hooks/use-*` + `api/*.api.ts`); **client state** via Zustand `store/*` (`use-auth-store` persisted to localStorage, `use-poll-builder-store` wizard, `use-dashboard-store`).
- API: single axios instance `src/lib/api.ts` (`withCredentials`) with a 401 interceptor that silently retries via `/auth/refresh-token` then `clearAuth()`, plus 429 toast.
- Path alias `@` → `src/`. Tailwind v4 configured via the Vite plugin (no `tailwind.config`); CSS-first in `src/index.css`.

## Real-time (Socket.io)

- Room-per-poll: client emits `join-poll-room`/`leave-poll-room` (`{pollId}`) → server room `poll_${pollId}`. Server broadcasts via `emitAnalyticsUpdate(pollId, data)` in `backend/src/socket/index.ts`.
- Client: singleton in `src/lib/socket.ts`; `hooks/use-poll-socket.ts` joins/leaves and dispatches events to callbacks (analytics page live charts).
- Note: client `SOCKET_EVENTS` declares more events (`new-response`, `poll-status-change`, `poll-closed`, `poll-published`) than the server emits — server currently only emits `analytics-update`.

## Poll submission flow

Public submit → `POST /api/responses/:pollId` → `response.controller` hashes IP + captures UA → `response.service` validates active/auth-mode + prod-only dedup → `ResponseModel.create` → **atomic `$inc`** on `Poll.totalResponses` and per-option `voteCount` (arrayFilters, concurrency-safe) → reload poll → `emitAnalyticsUpdate` broadcasts to the poll room → creator analytics page updates live.

## Analytics

Computed on-read in `analytics.service.ts` (no separate pipeline): totals/completion rate, 30-day timeline (`$dateToString` aggregation), browser/platform from UA parsing, per-question percentages, and `getWordCloudData` (tokenize + stop-word filter, top 50). Denormalized counts serve cheap live reads.

## Security note

`backend/.env` is committed with live secrets (MongoDB URI, Resend key, JWT secret, Google OAuth secret) and there is no `.env.example`. Do not add new secrets to tracked files; treat existing ones as needing rotation.
