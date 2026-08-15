# Bug Report — Poll Creation, Sharing & WebSockets

Scan date: 2026-08-15. Scope: poll creation flow, share/public-taking flow, real-time sockets. Findings verified against source (file:line confirmed by direct read).

## Severity summary

| # | Severity | Area | One-liner |
|---|----------|------|-----------|
| 1 | 🔴 Critical | Create | Poll creation hardcodes `status: "active"` → drafts & edit page are dead |
| 2 | 🔴 Critical | Share | QR code / "Copy URL" builds `/p/<pollId>` instead of `/p/<shareToken>` → 404 |
| 3 | 🔴 Critical | Share | Session-token keyed by `pollId` on submit but by `shareToken` on read → dedup broken |
| 4 | 🟠 High | WS | Server never emits `poll-status-change` → close/publish/expiry don't live-update |
| 5 | 🟠 High | WS | Socket CORS `origin:"*"` + `credentials:true` is invalid → breaks polling transport |
| 6 | 🟠 High | Create | No server-side validation; `PATCH /polls` does raw `$set` mass-assignment |
| 7 | 🟡 Medium | Share | Response submission has no server-side validation |
| 8 | 🟡 Medium | Share | Duplicate-vote prevention only runs in `production`, no unique DB index (race) |
| 9 | 🟡 Medium | WS | Socket auth token sent but never verified → anyone can join any poll room |
| 10 | 🟡 Medium | Create | Edit prefill never loads questions + crashes on null `expiresAt` |
| 11 | 🟢 Low | Various | Dead code / cosmetic (success screen, review preview, payload mismatch) |

---

## 🔴 Critical

### 1. Poll creation hardcodes `status: "active"` — drafts and the edit page are unreachable
`backend/src/modules/poll/poll.service.ts:18`

```ts
return await Poll.create({ ...pollData, creatorId: userId, shareToken, status: "active" });
```
Overrides the model's `"draft"` default. No code path ever creates a draft, so:
- `frontend/src/pages/polls/edit.tsx:27` redirects to analytics whenever `status !== "draft"` → **edit page unreachable for every poll**.
- Dashboard "Draft" filter/count and the draft badge are permanently empty.

**Fix:** Accept an intended status/publish flag from the client and set `status: pollData.status ?? "draft"`, OR — if creation is always "publish" — remove the `status !== "draft"` gate in `edit.tsx` and gate editing on `totalResponses === 0` (already enforced server-side).

### 2. QR code & "Copy URL" produce a dead link (404 for every scanner)
`frontend/src/components/analytics/qr-card-dialog.tsx:60`

```ts
const pollUrl = `${window.location.origin}/p/${pollId}`;   // pollId = Mongo _id
```
The public route resolves by **shareToken** (`App.tsx:59` → `/p/:shareToken`; `poll.service.ts:117` → `findOne({ shareToken })`). The dialog is handed `_id` from `analytics.tsx:283`. Every scanned QR / copied URL hits `findOne({ shareToken: "<objectId>" })` → null → 404. (The rest of the app correctly uses `buildShareUrl(poll.shareToken)`.)

**Fix:** Pass `shareToken={poll.shareToken}` into `QRCardDialog` and build the URL with `buildShareUrl(shareToken)`.

### 3. Session-token key mismatch — dedup silently broken, "Already responded" never shows
`frontend/src/hooks/use-public-poll.ts`

- Read / status: `getOrCreateSessionToken(shareToken)` (lines 14, 54)
- Submit: `getOrCreateSessionToken(pollId)` (line 39)

`getOrCreateSessionToken` stores under `kollects_session_<arg>` (`lib/utils.ts:17`), so submit and read use two different tokens. The token saved with the response is never the one sent on revisit → `alreadyResponded` is always false, the `AlreadyRespondedState` screen never renders, and users can re-answer.

**Fix:** Key the session token consistently by `shareToken` everywhere. `useSubmitResponse` still needs `pollId` for the `/responses/:pollId` URL, so pass both: `shareToken` for the token, `pollId` for the endpoint.

---

## 🟠 High

### 4. Server never emits `poll-status-change` — status changes don't live-update
`backend/src/socket/index.ts:47-51` only emits `analytics-update`. The client subscribes to `poll-status-change` (`use-poll-socket.ts:67`, wired in `analytics.tsx:85`) but nothing emits it. When a poll is closed/published (manually or by `expiry.job.ts`), an open analytics page shows stale status, a wrong "Live" badge, and wrong action buttons until manual refresh.

**Fix:** Add `emitPollStatusChange(pollId, { pollId, status })` in `socket/index.ts` and call it from the close/publish/reopen service paths and the expiry job — route all status mutations through one helper.

### 5. Socket CORS `origin:"*"` + `credentials:true` is invalid
`backend/src/socket/index.ts:13-17`. The client connects with `withCredentials:true` (`socket.ts:21`). Browsers forbid `Access-Control-Allow-Origin: *` on credentialed requests, so the moment the client falls back to the `polling` transport (common behind proxies) the handshake XHR is blocked and the socket never connects. Silent in dev (same origin).

**Fix:** Set `origin` to an explicit allowlist (frontend URL from config), or drop `credentials:true` if authing via `auth.token` instead of cookies. Wildcard + credentials cannot coexist.

### 6. No server-side validation on create/update; `PATCH /polls` mass-assignment
`poll.controller.ts:11-15, 48-53` + `poll.service.ts:76-88`. `pollZodSchema` (`poll.validation.ts`) is never run; `req.body` flows straight into `Poll.create({ ...pollData })` and `{ $set: updateData }`. A direct `PATCH /polls/:id` with `{ status, totalResponses, creatorId, shareToken, questions[].options[].voteCount }` is written unchecked (only guard: `totalResponses: 0` filter). Enables forged vote counts, forced status, ownership transfer.

**Fix:** Validate with `pollZodSchema` in the controller; for update, whitelist editable fields only (title, description, expiresAt, responseMode, settings, questions).

---

## 🟡 Medium

### 7. Response submission has no server-side validation
`response.route.ts:17` — `responseZodSchema` exists but is never wired in. `response.service.ts:69` iterates `req.body.answers` directly. A direct POST of `{}` / `{answers:[]}` still increments `totalResponses` (line 66) with zero valid answers; malformed `questionId`/`optionId` can throw 500 at the `arrayFilters` ObjectId cast (line 95).

**Fix:** Apply `responseZodSchema` on the route and validate that all `isMandatory` questions are answered before writing.

### 8. Duplicate-vote prevention only runs in production; no unique index (race)
`response.service.ts:38` gates dedup behind `config.ENVIRONMENT === "production"`. Non-prod accepts unlimited duplicates. Even in prod, there's no unique DB index, so concurrent submits race between `findOne` (48) and `create` (56). Also verify `app.set('trust proxy')` so `req.ip` isn't the proxy IP (which would collapse all users to one `ipHash`).

**Fix:** Enforce dedup in all environments; add a partial unique index on `{pollId, sessionToken}` (and/or `{pollId, respondentId}`).

### 9. Socket auth token never verified — any client can join any poll room
`socket.ts:23` sends `auth:{token}` but `initializeSocket` has no `io.use(...)` middleware and `join-poll-room` (`socket/index.ts:21`) does no authorization. Any anonymous client can subscribe to any poll's live analytics.

**Fix:** Add a socket JWT-verify middleware and check poll ownership/visibility in `join-poll-room` before `socket.join`.

### 10. Edit prefill never loads questions + crashes on null `expiresAt`
`frontend/src/pages/polls/edit.tsx:31-37`. `updateMeta` only sets meta fields (type excludes `questions`), so existing questions are never loaded into the builder — the edit review submits whatever leftover/default questions are in the singleton store, silently replacing real ones. Line 34 `poll.expiresAt.slice(0,16)` throws when `expiresAt` is null. (Currently masked by #1 making the page unreachable; fires once #1 is fixed.)

**Fix:** Add a store setter to replace `form.questions` (map poll questions/options back to builder shape) and guard `poll.expiresAt ? poll.expiresAt.slice(0,16) : ""`.

---

## 🟢 Low (cleanup)

- **Dead success screen + double toast** — `step-review.tsx:26-34` navigates straight to analytics; `StepSuccess` (share-link screen) never shows, and two "created/published" toasts fire.
- **Review preview mislabels multiple-choice** — `step-review.tsx:89-100` / `step-review-edit.tsx:55-61` gate options on `single_choice` only, so `multiple_choice` renders as "Open-ended text". Data submitted is correct; preview only.
- **`analytics-update` payload shape mismatch** — server emits `{pollId, totalResponses, questions(raw)}`; client `AnalyticsUpdatePayload` expects `completionRate` + `QuestionStat[]`. Harmless today (consumer only reads `totalResponses` then refetches) but a latent trap.
- **Dead `onNewResponse` handler** — client subscribes to `new-response`; server never emits it.
- **`VITE_APP_URL` never honored** — `config.ts:5,10` always uses `window.location.origin`; share/QR links bake in whatever host (localhost/preview) the creator was on. Route all share URLs through `buildShareUrl` and add `appUrl: import.meta.env.VITE_APP_URL || window.location.origin`.

---

## Verified correct (no action)

- `shareToken` generation (`crypto.randomUUID()`) and its unique index; not regenerated on edit (URL stays stable); edits blocked once `totalResponses > 0`.
- Public poll sanitization strips `creatorId`, hides `voteCount` on active/closed; results endpoint gated on `isResultsPublic || status === "published"`.
- Socket room names match (`poll_${pollId}` on join and emit); listeners cleaned up in useEffect; join-before-connect guarded; rejoin-after-reconnect works. No leak/stale-closure.
- Question/option `order` indexing is correct zero-based; Zustand updates are immutable.

## Recommended fix order
1. #2 and #3 (share flow, tiny diffs — "use shareToken not pollId") — the feature is 100% broken for end users.
2. #1 (one line) — unblocks editing/drafts.
3. #5 + #4 (sockets) — real-time breaks in prod.
4. #6, #7, #9 (validation/authz) — security.
5. #8, #10, then Low items.
