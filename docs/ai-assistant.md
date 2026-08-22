# AI Assistant — chat-to-create polls & forms

Lets users **chat with an LLM to build polls and forms**. Two surfaces:

1. **Dashboard assistant** (`/dashboard/chat`) — free-form conversation; the AI asks
   clarifying questions, suggests better questions, then **creates the poll/form
   server-side** and returns the **shareable link inline in the chat**. Conversations
   are **persisted** so users can resume and follow up.
2. **In-builder assistant** (poll & form create pages) — a right-side chat panel next
   to the live builder. The AI adds **one question at a time to the builder store**
   (preview only). The user still clicks the normal Create/Publish to save. This chat
   is **stateless** (session only).

Provider: **OpenAI SDK pointed at Mistral's base URL** — swap `MISTRAL_BASE_URL` /
`MISTRAL_MODEL` for any OpenAI-compatible provider with no code change. Delivery is
**non-streaming** (single reply per turn, "Thinking…" indicator).

## Config (`backend/src/config/config.ts`)

| key | default |
|---|---|
| `MISTRAL_API_KEY` | `""` (already in `.env`) |
| `MISTRAL_BASE_URL` | `https://api.mistral.ai/v1` |
| `MISTRAL_MODEL` | `mistral-large-latest` |

## DB — `backend/src/modules/ai/conversation.model.ts`

```
Conversation {
  userId (ref User, indexed),
  title,                          // first user message, truncated
  messages: [{ role: "user"|"assistant", content, actions?: [AiAction], createdAt }],
  timestamps
}
```
Index: `{ userId, updatedAt: -1 }`. Only the **dashboard** surface persists here.

## Backend — `backend/src/modules/ai/`

- `ai.client.ts` — `new OpenAI({ apiKey, baseURL })`, `AI_MODEL`, `isAiConfigured()`.
- `ai.tools.ts` — per-surface tool defs + `AiAction` type + `systemPrompt(surface)`.
  - dashboard: `create_poll`, `create_form` (execute + return link).
  - poll-builder: `add_poll_question`, `set_poll_meta`. form-builder: `add_form_question`, `set_form_meta` (returned to client, not executed).
- `ai.service.ts` — `runChat({ userId, surface, messages, builderSummary })`:
  1. system prompt + history (last 20) → `chat.completions.create({ model, messages, tools, tool_choice:"auto" })`.
  2. On `tool_calls`: dashboard create tools map args → `createPollSchema`/`createFormSchema.parse` → **reuse `PollService.createPoll` / `FormService.createForm`** → push `{kind:"created", url}` action; builder tools push an `add_*`/`set_meta` action (no persistence). Tool errors (e.g. Zod) are fed back so the model self-corrects. Loop capped at **5**.
  3. Returns `{ reply, actions }`.
- `ai.controller.ts` + `ai.route.ts` (mounted `/api/ai`, `verifyJWT`, 30 req/min limiter):
  - `POST /chat` — dashboard: load/create Conversation, append user + assistant (with actions), save, return `{conversationId, reply, actions, title}`. Builder: stateless over `messages`, return `{reply, actions}`. 503 if `MISTRAL_API_KEY` missing.
  - `GET /conversations`, `GET /conversations/:id`, `DELETE /conversations/:id` (owner-scoped).

## Frontend

- `api/ai.api.ts`, `hooks/use-ai.ts` (`useSendChat`, `useConversations`, `useConversation`, `useDeleteConversation`).
- `components/ai/` — `chat-messages.tsx`, `chat-composer.tsx`, `created-link-card.tsx` (share link + copy), `builder-chat-panel.tsx`.
- `pages/dashboard/chat.tsx` — conversation list + active chat; assistant `created` actions render link cards. Route `/dashboard/chat`, sidebar item **AI Assistant** (Sparkles).
- Builder panels: `pages/polls/create.tsx` and `pages/forms/create.tsx` wrap the wizard in `flex-row` with a `w-96 border-l` panel; `applyPollActions`/`applyFormActions` translate AI actions into `setForm({questions|sections})` on the existing stores (reusing `makeQuestion` / `newObjectId` / `uuidv4`). The existing step components are the live preview.

## `AiAction` contract (shared BE↔FE)

```
| { kind:"created"; entity:"poll"|"form"; id; shareToken; url; title }
| { kind:"add_poll_question"; question:{ text; type; isMandatory?; options?[] } }
| { kind:"add_form_question"; question:{ type; title; isRequired?; options?[]; rows?[]; columns?[]; scaleMin?; scaleMax? } }
| { kind:"set_meta"; entity:"poll"|"form"; title?; description? }
```

## Flow

- **Dashboard**: user chats → AI clarifies → calls `create_poll`/`create_form` → server persists via existing services → link card appears in chat. Follow-ups reuse the stored history.
- **Builder**: user chats → AI calls `add_*_question` → client applies to the store → the question appears live on the left, one at a time → user finalizes with Create/Publish.

## Edge cases

Missing key → 503 · invalid tool args → Zod error fed back, capped retries · `responseMode` defaults to `anonymous` · form `_id`s minted server-side · poll options sanitized · history + iterations capped · endpoint rate-limited · builder action with no section → last section.

## Verify

`cd backend && npx tsc --noEmit` · `cd frontend && npm run typecheck && npm run lint && npm test`. Manual: dashboard chat "make a 3-question feedback poll" → link appears & opens; builder "add a question asking the user's name" → question appears live.
