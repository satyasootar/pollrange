# Forms Feature — Implementation Plan

A rich form builder for **kollects**, living alongside the existing Polls
feature. This plan mirrors the proven Poll/Response architecture rather than inventing
new patterns.

---

## 1. Scope (locked)

| Area | Decision |
|---|---|
| **Field types** | short answer, paragraph, multiple choice, checkboxes, dropdown, linear scale, rating, date, time, multiple-choice grid, checkbox grid, **file upload** (12 types) |
| **Advanced** | sections / multi-page, conditional branching (go-to-section), quiz mode + grading, per-field answer validation |
| **Responses view** | full suite — Summary / Question / Individual tabs + spreadsheet table + CSV export |
| **Editor UX** | existing 3-step wizard shell (Settings → Questions → Review) |
| **File storage** | Cloudinary |
| **Delivery** | phased (6 phases) |

**Three defaults applied (flip if you disagree):**
1. **Editing after responses:** *allow editing anytime*, with a UI
   warning that deleting a question orphans its existing answers. (Polls lock edits once
   `totalResponses > 0`; Forms deliberately do not.)
2. **Dashboard:** a separate **"Forms"** sidebar item at `/dashboard/forms`; the current
   "Dashboard" entry relabeled to **"Polls"**.
3. **Location:** this file, `docs/forms-feature-plan.md`.

---

## 2. Architecture

A **separate `form` backend module** mirroring `modules/poll/` — *not* a `type`
discriminator on `Poll`. Rationale: 12 question types, per-question validation, quiz
answer keys, sections, and file answers diverge too far from the poll's vote-tally model;
one shared schema would bloat both and weaken type inference.

**Reused verbatim from the poll stack** (no changes to these): `verifyJWT`, the
`optionalAuth` swallow-error pattern, `ApiError` / `ApiResponse`, the central `errorHandler`
(incl. `ZodError → 400`), `rateLimit.middleware`, `crypto.randomUUID()` share tokens, the
soft-delete + lazy-expiry-on-read + denormalized-counter patterns, and `socket/index.ts`
(add a `form_${formId}` room + `emitFormAnalyticsUpdate`, additive).

**New dependencies:** backend `cloudinary` + `multer` (+`@types/multer`). Frontend: **none** —
drag-reorder uses framer-motion's built-in `Reorder`; charts reuse the already-present recharts.

---

## 3. Database Design

Two new collections — `forms` and `formresponses`. **No change to `polls` / `responses`.**
Single source of truth for shape is the Zod schema (`form.validation.ts`), same convention as
`poll.validation.ts` where `IPoll = z.infer<typeof pollZodSchema>`.

### 3.1 `Form` (root document)

| Field | Type | Notes |
|---|---|---|
| `creatorId` | ObjectId → User | required, indexed |
| `title` | String | required, ≤200 |
| `description` | String | ≤1000 |
| `coverImageUrl` | String? | Cloudinary URL |
| `shareToken` | String | required, **unique**, indexed (`crypto.randomUUID()`) |
| `isQuiz` | Boolean | default false |
| `status` | enum draft/active/closed/published | default draft, indexed |
| `responseMode` | enum anonymous/authenticated | required |
| `expiresAt` | Date? | indexed |
| `totalResponses` | Number | denormalized, default 0 |
| `isDeleted` | Boolean | soft-delete, indexed |
| `isResultsPublic` | Boolean | default false |
| `publishedAt` / `closedAt` / `resultsPublishedAt` | Date? | |
| `settings` | subdoc | see below |
| `sections` | `[Section]` | embedded |
| `timestamps` | | createdAt/updatedAt |

`settings`: `collectEmail`, `limitOneResponse`, `allowResponseEdit`, `showProgressBar`,
`shuffleQuestions`, `confirmationMessage` (String), `releaseScoreImmediately` (quiz).

### 3.2 `Section` (embedded in `Form.sections[]`)

`_id`, `title?`, `description?`, `order` (Number), `questions: [FormQuestion]`, and
`navigation` — one of `"next"` | `"submit"` | `{ type: "byAnswer", questionId }` (conditional
branching; the per-answer target lives on the question's `optionNavigation`).

### 3.3 `FormQuestion` (embedded in `Section.questions[]`)

Common: `_id`, `order`, `type` (the 12-value enum), `title`, `description?`, `imageUrl?`,
`isRequired` (default false — Forms differ from polls where mandatory defaults true).

Type-specific (only the relevant block is populated per `type`):
- **choice/dropdown** (`multiple_choice`, `checkboxes`, `dropdown`): `options: [{ _id, text, order, imageUrl?, responseCount (denormalized, default 0) }]`, `optionNavigation?: { [optionId]: sectionId | "submit" }` (branching).
- **scale/rating** (`linear_scale`, `rating`): `scaleMin`, `scaleMax`, `scaleMinLabel?`, `scaleMaxLabel?`.
- **grids** (`multiple_choice_grid`, `checkbox_grid`): `rows: [String]`, `columns: [String]`.
- **file** (`file_upload`): `fileConfig: { maxFiles, maxSizeMb, allowedTypes: [String] }`.
- **text/number** (`short_answer`, `paragraph`, `date`, `time`): `validation?: { kind: "number_range"|"regex"|"length", ... , message }`.
- **quiz** (any gradable type, when `Form.isQuiz`): `points` (Number), `answerKey: { correctOptionIds?: [], correctText?, feedback? }`.

### 3.4 `FormResponse` (separate collection)

| Field | Type | Notes |
|---|---|---|
| `formId` | ObjectId → Form | required, indexed |
| `respondentId` | ObjectId → User? | only for authenticated submits |
| `sessionToken` | String | required — anonymous dedup key |
| `respondentEmail` | String? | when `settings.collectEmail` |
| `ipHash` | String | sha256(ip), same as responses |
| `userAgent` | String | for browser breakdown |
| `answers` | `[FormAnswer]` | see below |
| `score` / `totalPoints` | Number? | quiz only |
| `isComplete` | Boolean | required |
| `submittedAt` | Date | required |

`FormAnswer`: `questionId` + exactly one value block by type — `textValue?`, `numberValue?`,
`dateValue?`, `selectedOptionIds: []`, `scaleValue?`, `gridValues?: [{ row, columns: [] }]`,
`fileUrls?: [{ url, name, size, mimeType }]` — plus `isCorrect?`, `pointsEarned?` (quiz) and
`skipped`.

### 3.5 Indexes (mirror the response module's race-safe design)

- `forms`: `{ creatorId: 1, createdAt: -1 }` (paginated "my forms"), `shareToken` unique, `status`, `expiresAt`, `isDeleted`.
- `formresponses`: `{ formId: 1, submittedAt: -1 }` (listing/timeline); `{ formId: 1, sessionToken: 1 }` **unique**; `{ formId: 1, respondentId: 1 }` **unique, partialFilterExpression { respondentId: { $exists: true } }** (one-per-user without colliding anonymous nulls). The two unique indexes are the dedup backstop against races.

### 3.6 Denormalization & consistency

Same fast-path-not-source-of-truth strategy as polls: choice-option `responseCount` and
`Form.totalResponses` are maintained by atomic `$inc` (`arrayFilters` for nested option
counts) on submit; every other type (text/scale/grid/file) is **computed on read** from
`formresponses`. Analytics recomputes `totalResponses` from `countDocuments`, so a crash
between the response insert and the counter `$inc` self-heals on next read (documented
limitation, identical to the poll flow — **not** transactional).

### 3.7 Schema evolution

Because forms are editable after publish, existing `FormResponse.answers` can reference
questions that were later edited/removed. Answers store `questionId` + a denormalized
`questionTitleSnapshot` (added to `FormAnswer`) so the Individual/table views and CSV stay
readable even when a question is gone. No destructive migration of old responses.

---

## 4. Type Safety

`tsconfig` is `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`, so the
design leans on these:

- **Zod as the single source of truth.** `form.validation.ts` defines the DB shape; `IForm`,
  `ISection`, `IFormQuestion` = `z.infer<...>`; the Mongoose model is typed `Schema<IForm>`.
  Request-facing schemas (`createFormSchema`, `updateFormSchema = createFormSchema.partial()`,
  `submitFormResponseSchema`) whitelist client-editable fields to block mass-assignment —
  exactly the poll convention.
- **Discriminated union for question types** — the key type-safety win. The question schema is
  a `z.discriminatedUnion("type", [...])` on the backend and a matching TS discriminated union
  `FormQuestion` on the frontend, so accessing `scaleMin` is a compile error on a
  `short_answer` question and each per-type editor/renderer narrows correctly. Same treatment
  for `FormAnswer` (union keyed by the question's type).
- **Shared enums declared once** — question-type and status literals live in one place per side
  and are imported everywhere (no stringly-typed duplication).
- **Envelope typing matches reality, not the unused `ApiResponse<T>` interface.** The app
  double-nests (`res.data.data`) and list endpoints return a named field (`{ forms, pagination }`,
  not `items`). Frontend api methods type each response inline and hooks unwrap with
  `select: res => res.data.data`, mirroring `polls.api.ts` / `use-polls.ts`.
- **Builder ↔ API mappers are typed** — `toCreateFormPayload(builderForm)` flattens local-`id`
  builder questions to server order-indexed shape (mirrors `polls.api.ts:toCreatePayload`),
  with the discriminated union preserved end to end.
- **`noUncheckedIndexedAccess` discipline** — array/record access in branching resolution,
  grid rendering, and answer lookup is guarded; no non-null assertions on indexed reads.

---

## 5. Backend surface

- **`/api/forms`** (all `verifyJWT`): `POST /`, `GET /` (pagination + `status` + `search`),
  `GET /:formId`, `PATCH /:formId` (allowed anytime), `DELETE /:formId` (soft), `POST /:formId/duplicate`,
  `PATCH /:formId/close`, `PATCH /:formId/reopen`, `POST /:formId/publish`, `POST /:formId/regenerate-token`,
  `POST /:formId/upload` (creator image → Cloudinary).
- **`/api/public/forms`** (optionalAuth): `GET /:shareToken`, `/:shareToken/results`, `/:shareToken/status`.
- **`/api/form-responses`**: `POST /:formId` (submit; `responseRateLimiter`; auto-grades quizzes),
  `POST /:formId/upload` (respondent file → Cloudinary, rate-limited, returns URL), `GET /history` (`verifyJWT`).
- **`/api/form-analytics`** (all `verifyJWT`): `GET /:formId/summary`, `/:formId/questions`,
  `/:formId/responses` (paginated individual), `/:formId/export` (CSV, `responseType: blob`).
- **Router assembly:** add imports + mounts to `backend/src/routes/index.ts` (mirrors the 5 existing mounts).
- **Cloudinary:** `config/cloudinary.ts` (SDK init from env) + a multer-memory upload util streaming to
  `cloudinary.uploader.upload_stream`. New env keys (`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`) —
  **not committed**; documented in a new `backend/.env.example` (the repo currently has none).

---

## 6. Frontend surface

Mirrors the poll layer: `types/index.ts` (+Form/Section/FormQuestion union/PublicForm/answer
payloads/builder types/FormFilters), `api/forms.api.ts` + `form-public.api.ts` +
`form-analytics.api.ts`, hooks `use-forms.ts` (`formKeys` + CRUD mutations) / `use-public-form.ts`
/ `use-form-analytics.ts` / `use-form-socket.ts`, store `use-form-builder-store.ts`.

- **Builder** (3-step wizard cloned from `pages/polls/create.tsx` + `edit.tsx`): Step 1 settings
  (title, description, cover image, responseMode, quiz toggle, collect-email, limit-one-response,
  shuffle, progress bar, confirmation message, expiry); Step 2 sections + question cards with a
  type picker and per-type editors (options / scale min-max+labels / grid rows+cols / file config /
  date-time / validation rules), required toggle, branching config, quiz answer key + points,
  **drag-reorder via framer `Reorder`**; Step 3 review/publish (POST) and edit-save (PATCH).
- **Public taking** (`/f/:shareToken`): section-by-section paging, all 12 renderers, live
  validation, branching navigation, file-upload widget (uploads to the respondent endpoint,
  stores returned URLs), progress bar, `getOrCreateSessionToken` dedup, the existing auth-gate +
  `localStorage` resume-after-Google-redirect flow, and quiz score on submit when
  `releaseScoreImmediately`.
- **Responses suite** (`/forms/:formId/analytics`): Summary (per-question charts) / Question
  (deep per-question) / Individual (one-by-one) tabs + spreadsheet table + CSV, live over the
  form socket room. Reuses recharts + `question-chart` for choice types; new summary components
  for text/scale/grid/file/quiz.
- **Dashboard:** "Forms" nav item in `app-shell.tsx` `navItems` (route `/dashboard/forms`),
  "Dashboard" relabeled "Polls", the `NavItem` hardcoded `end`-match list (`app-shell.tsx:53`)
  extended, a `FormCard` mirroring `PollCard`. Routes added to `App.tsx`: `/forms/create`,
  `/forms/:formId/edit`, `/forms/:formId/analytics` (pathless `AppShell` block), `/f/:shareToken`,
  `/f/:shareToken/results`, `/dashboard/forms`.

---

## 7. Error Handling

**Backend**
- Services `throw new ApiError(status, msg)`; Express 5 auto-forwards async rejections to the
  central `errorHandler` (no `asyncHandler` wrapper — matches the codebase). Zod `.parse()` runs
  inline in controllers; `ZodError → 400` with `{path,message}[]` centrally.
- **Dedup races:** app-level `$or` existence check → 403, plus a `try/catch` translating Mongo
  duplicate-key `11000` → 403 (the unique-index backstop), identical to `response.service.ts`.
- **Lifecycle guards on submit:** form not `active` → 404; past `expiresAt` → flip closed + 410;
  `authenticated` mode without a user → 401; missing required answers → 400; `limitOneResponse`
  already satisfied → 403.
- **Validation rules** (number range / regex / length) enforced server-side on submit, not just
  in the browser — 400 with the question's `validation.message`.
- **Branching integrity:** on create/update, validate section-navigation targets exist and the
  branch graph is acyclic → 400 on a bad/looping target (prevents infinite loops at fill time).
- **Quiz keys:** validated at save (a gradable question in a quiz must have an `answerKey`;
  `points ≥ 0`) → 400.
- **File upload:** multer `limits` (size) + an `allowedTypes` mime check → 400 on oversize/wrong
  type; Cloudinary failure → 502 with the partial upload cleaned up. **Orphan strategy:** files are
  uploaded *before* the response doc is created; if the final submit fails, the URLs are simply
  never referenced — a scheduled cleanup of unreferenced Cloudinary assets is noted as deferred
  (acceptable low-cost leak for v1; documented, not silently ignored).
- **Non-transactional counter drift:** accepted and self-healing (analytics recomputes from
  `countDocuments`) — same documented ceiling as polls.

**Frontend**
- Mutations `toast.error(getApiErrorMessage(err))` on error, `toast.success` on success, and
  invalidate `formKeys.detail(id)` + `formKeys.all` — the established hook pattern.
- Public-taking guard screens (closed / expired / already-responded / submitted / draft) reuse the
  poll state-screen pattern.
- Submit is gated by client-side required + validation checks (mirrors backend rules) so users get
  inline errors before a round-trip; the server remains the authority.
- **File upload UX:** per-file progress, size/type rejected client-side with a message, retry on
  failure, and submit disabled until in-flight uploads resolve.
- A route-level error boundary around the builder and public-taking pages so a render throw shows a
  recoverable fallback rather than a blank screen.

---

## 8. Impact Assessment

**Overall risk: low.** The feature is overwhelmingly *additive* — new modules, collections,
routes, pages, hooks, and store. The existing Poll feature's code paths are untouched except for a
few small, well-scoped edits.

**Existing files modified (small, surgical):**
| File | Change | Risk |
|---|---|---|
| `backend/src/routes/index.ts` | +3–4 route mounts | trivial |
| `backend/src/socket/index.ts` | +`form_` room + `emitFormAnalyticsUpdate` (additive) | low — poll room logic unchanged |
| `backend/package.json` | +`cloudinary`, `multer`, `@types/multer` | low |
| `frontend/src/App.tsx` | +6 routes, +imports | low |
| `frontend/src/components/layout/app-shell.tsx` | +Forms nav item, relabel "Dashboard"→"Polls", extend `end`-match list | low — visible UX change, verify active-state |
| `frontend/src/types/index.ts` | +Form type block (additive) | none to poll types |

**New collections:** `forms`, `formresponses` — zero impact on `polls`/`responses`. New indexes
only.

**Shared components:** `DashboardView` is already parameterized (`isCompact`/`hideTopBar`/
`onPollClick`) — evaluate reuse for the forms list vs a thin clone; lean to clone if the card/action
set diverges (Forms has no "publish permanent vs live" nuance but adds "duplicate"). No shared
component is *modified* in a breaking way.

**Socket:** additive namespace (`form_${formId}`); the existing `poll_` rooms and
`emitAnalyticsUpdate` are unchanged. `SOCKET_EVENTS` gains `FORM_*` entries.

**Security (new surface — the main thing to get right):**
- **File upload** is the largest new attack surface: enforce mime allowlist (block executables/SVG-
  with-script), size caps, per-IP rate limiting, auth on creator uploads, and Cloudinary signed
  uploads; never trust client-reported type. Serve via Cloudinary CDN, not the app server.
- **PII:** `respondentEmail` + individual responses are owner-only (verify form ownership in the
  analytics controller before returning, like `getPollRespondents`).
- **Secrets:** Cloudinary keys via env only; add `backend/.env.example` (repo has none today), do
  **not** commit real keys.

**Performance:** forms can be far larger than polls (many sections/questions) and response docs are
heavier (file URLs, grids). Mitigations: individual-response endpoint is **paginated**; CSV export
streams; analytics stays compute-on-read but with the denormalized option counts as the fast path;
consider a soft cap on questions-per-form and file-size to bound worst case.

**Backward compatibility:** nothing removed or renamed in the API; the only user-visible change to
existing behavior is the sidebar label "Dashboard" → "Polls". Poll routes, hooks, and analytics are
untouched.

**Bundle size (frontend):** no new runtime deps — recharts and framer-motion (`Reorder`) are
already installed.

---

## 9. Phases (each independently shippable + testable)

1. **Foundation** — `Form` + `FormResponse` models/validation (with the discriminated union),
   basic CRUD + publish/close/reopen/duplicate/regenerate, routes mounted, `forms.api`/`use-forms`/
   builder store, dashboard **Forms** section + `FormCard` + list, 3-step wizard with the **basic
   types** (short answer, paragraph, multiple choice, checkboxes, dropdown), public taking + submit
   + dedup. Delivers a working end-to-end "Forms-lite."
2. **Rich field types** — linear scale, rating, date, time, grids: builder editors, public
   renderers, response storage, summary rendering.
3. **Structure & logic** — sections / multi-page, per-field validation rules, conditional branching
   (with acyclic-graph validation).
4. **Quiz mode & grading** — quiz toggle, answer keys + points in builder, auto-grade on submit,
   score display, quiz analytics.
5. **Responses suite** — Summary / Question / Individual tabs + spreadsheet table + CSV export +
   live socket updates.
6. **File upload** — Cloudinary infra (`config/cloudinary.ts`, `.env.example`), creator image
   uploads + the respondent `file_upload` question type end-to-end, with the security controls above.

---

## 10. Verification (per phase)

- Backend: `cd backend && npm run build` (tsc).
- Frontend: `cd frontend && npm run typecheck && npm run lint`.
- Manual E2E in `npm run dev`: create a form → fill each field type as a respondent → confirm the
  response is stored, dedup blocks a second submit, summary/question/individual views + CSV reflect
  it, branching routes to the right section, validation rejects bad input server-side, and (phase 4)
  quiz scores compute. Phase 6: upload a file, confirm it lands in Cloudinary, is size/type-guarded,
  and appears in the individual response.

No test framework exists in either package (per `CLAUDE.md`), so quality gates are the build/lint
commands above plus manual E2E — matching the current project convention.
