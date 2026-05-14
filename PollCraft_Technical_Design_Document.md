# PollCraft — Production-Grade Technical Design Document

> **Stack:** React + TypeScript + TailwindCSS + shadcn/ui · Express + TypeScript · MongoDB + Mongoose · Socket.io
> **Version:** 1.0.0 | **Type:** Hackathon → Production Blueprint

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Frontend — Pages & User Flows](#3-frontend--pages--user-flows)
4. [Database Design](#4-database-design)
5. [Backend Architecture](#5-backend-architecture)
6. [API Routes — Complete Reference](#6-api-routes--complete-reference)
7. [Service Layer](#7-service-layer)
8. [WebSocket Implementation](#8-websocket-implementation)
9. [Middleware](#9-middleware)
10. [Validation Layer](#10-validation-layer)
11. [Error Handling Strategy](#11-error-handling-strategy)
12. [Security Design](#12-security-design)
13. [Analytics Engine](#13-analytics-engine)
14. [Poll Expiry System](#14-poll-expiry-system)
15. [Word Cloud Implementation](#15-word-cloud-implementation)
16. [Environment & Configuration](#16-environment--configuration)
17. [Folder Structure](#17-folder-structure)

---

## 1. Project Overview

PollCraft is a full-stack polling platform that allows authenticated users to create structured polls with multiple questions, share them via public links, collect responses (anonymously or authenticated), and view real-time analytics. After a poll closes, creators can publish results publicly.

### Core Capabilities

| Feature | Description |
|---|---|
| Poll Creation | Multi-question polls with single-choice options |
| Anonymous / Authenticated Responses | Creator chooses response mode per poll |
| Expiry System | Poll auto-closes at a set date/time |
| Mandatory / Optional Questions | Per-question setting with frontend + backend validation |
| Real-Time Analytics | Socket.io live updates on response count and option distribution |
| Publish Results | Creator can publish results; public can view after publish |
| Word Cloud | Visual representation of poll title and option trends |

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (React + TS)                   │
│  Auth Pages → Dashboard → Poll Builder → Response Form →     │
│  Analytics Dashboard → Published Results View                │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP (REST) + WebSocket (Socket.io)
┌────────────────────────▼─────────────────────────────────────┐
│                   EXPRESS SERVER (Node + TS)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  Auth    │  │  Poll    │  │ Response │  │  Analytics  │  │
│  │  Router  │  │  Router  │  │  Router  │  │   Router    │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           Service Layer (Business Logic)                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           Socket.io Event Bus                            │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────────────┘
                         │ Mongoose ODM
┌────────────────────────▼─────────────────────────────────────┐
│                     MongoDB Atlas                             │
│  users · polls · questions · responses · sessions            │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend — Pages & User Flows

### 3.1 Page Inventory (10 Pages)

| # | Route | Page Name | Access |
|---|---|---|---|
| 1 | `/` | Landing / Home | Public |
| 2 | `/auth/login` | Login | Public (redirect if authed) |
| 3 | `/auth/register` | Register | Public (redirect if authed) |
| 4 | `/dashboard` | Creator Dashboard | Protected |
| 5 | `/polls/create` | Poll Builder | Protected |
| 6 | `/polls/:pollId/edit` | Poll Editor | Protected (owner only) |
| 7 | `/polls/:pollId/analytics` | Analytics Dashboard | Protected (owner only) |
| 8 | `/p/:shareToken` | Public Poll Response Form | Public / Conditional Auth |
| 9 | `/p/:shareToken/results` | Published Results View | Public (after publish) |
| 10 | `/404` | Not Found | Public |

---

### 3.2 Complete User Flows

#### FLOW A — Creator Registration & Onboarding

```
[Landing Page]
  → Click "Get Started" / "Sign Up"
  → [Register Page]
      → Fill: name, email, password, confirm password
      → Submit → POST /api/auth/register
      → On success → auto-login → redirect to [Dashboard]
      → On error → inline field errors shown
```

#### FLOW B — Creator Login

```
[Login Page]
  → Fill: email, password
  → Submit → POST /api/auth/login
  → On success → store JWT in httpOnly cookie (or localStorage with refresh)
  → Redirect to [Dashboard]
  → On error → "Invalid credentials" toast
```

#### FLOW C — Creating a Poll (Happy Path)

```
[Dashboard]
  → Click "Create New Poll"
  → [Poll Builder Page]
      ┌─────────────────────────────────────┐
      │  Step 1: Poll Settings              │
      │  - Poll Title (required)            │
      │  - Description (optional)           │
      │  - Expiry Date & Time (required)    │
      │  - Response Mode: Anonymous /       │
      │    Authenticated                    │
      └─────────────────────────────────────┘
      ┌─────────────────────────────────────┐
      │  Step 2: Questions Builder          │
      │  - Add Question button              │
      │  - Per question:                    │
      │    • Question text                  │
      │    • Add options (min 2)            │
      │    • Mark Mandatory / Optional      │
      │    • Delete question                │
      │  - Drag to reorder (optional)       │
      └─────────────────────────────────────┘
      ┌─────────────────────────────────────┐
      │  Step 3: Review & Publish           │
      │  - Preview of all questions         │
      │  - Copy share link                  │
      │  - Submit → POST /api/polls         │
      └─────────────────────────────────────┘
      → On success → toast "Poll created!"
      → Redirect to [Analytics Dashboard]
```

#### FLOW D — Sharing a Poll

```
[Analytics Dashboard] or [Dashboard]
  → Click "Copy Share Link"
  → Link copied: https://pollcraft.app/p/:shareToken
  → Creator shares link externally (WhatsApp, email, etc.)
```

#### FLOW E — Respondent Opens Poll (Anonymous Mode)

```
[Respondent opens /p/:shareToken]
  → GET /api/public/polls/:shareToken (fetch poll metadata)
  → Check: poll active? not expired? → render form
  → If poll expired → show "This poll has closed" screen
  → If poll published → redirect to /p/:shareToken/results
  → [Response Form]
      - Poll title, description shown
      - Each question rendered with radio buttons
      - Mandatory questions marked with red asterisk (*)
      - Submit button
  → Validation:
      - All mandatory questions answered → enable submit
      - Optional questions can be skipped
  → Submit → POST /api/public/polls/:shareToken/respond
  → On success → "Thank you for your response!" screen
  → If already responded (anonymous cookie / fingerprint) → "Already submitted"
```

#### FLOW F — Respondent Opens Poll (Authenticated Mode)

```
[Respondent opens /p/:shareToken]
  → GET /api/public/polls/:shareToken
  → Poll requires authentication
  → If not logged in → redirect to /auth/login?redirect=/p/:shareToken
  → After login → redirect back to /p/:shareToken
  → If already responded → "You have already submitted a response"
  → Else → render form, submit with JWT header
```

#### FLOW G — Creator Views Analytics (Real-Time)

```
[Dashboard]
  → Click poll card → "View Analytics"
  → [Analytics Dashboard /polls/:pollId/analytics]
      → GET /api/polls/:pollId/analytics
      → WebSocket: socket.emit('join-poll-room', pollId)
      → Dashboard renders:
          ┌──────────────────────────────────────┐
          │  Overview Cards                       │
          │  - Total Responses                   │
          │  - Completion Rate                   │
          │  - Time Remaining / Status           │
          │  - Anonymous / Identified split      │
          └──────────────────────────────────────┘
          ┌──────────────────────────────────────┐
          │  Per-Question Charts                  │
          │  - Bar chart of option counts        │
          │  - Percentage labels                  │
          │  - Top answer highlighted            │
          └──────────────────────────────────────┘
          ┌──────────────────────────────────────┐
          │  Participation Timeline              │
          │  - Responses over time (line chart)  │
          └──────────────────────────────────────┘
          ┌──────────────────────────────────────┐
          │  Word Cloud                          │
          │  - Built from option texts           │
          └──────────────────────────────────────┘
      → Real-time: socket listens for 'analytics-update'
      → Numbers animate on new response
```

#### FLOW H — Closing & Publishing Results

```
[Analytics Dashboard]
  → Poll is active → creator sees "Close Poll Early" button
  → OR poll auto-expires → status becomes "closed"
  → Creator clicks "Publish Results"
  → PATCH /api/polls/:pollId/publish
  → Confirmation modal → "Are you sure? This is irreversible."
  → On confirm → poll status = "published"
  → Shareable results link shown: /p/:shareToken/results
  → Anyone with the link can now see published results
```

#### FLOW I — Public Views Published Results

```
[Anyone opens /p/:shareToken]
  → GET /api/public/polls/:shareToken
  → status = "published" → redirect to /p/:shareToken/results
  
[/p/:shareToken/results]
  → GET /api/public/polls/:shareToken/results
  → Shows read-only results:
      - Final response counts
      - Bar charts per question
      - Word cloud
      - No more response form
```

#### FLOW J — Editing a Draft Poll

```
[Dashboard]
  → Poll status = "draft" (no responses yet)
  → Click "Edit" → [/polls/:pollId/edit]
  → Same interface as Poll Builder, pre-populated
  → Can modify questions, options, expiry, settings
  → Save → PATCH /api/polls/:pollId
  → Note: Once first response is received, editing is locked
```

#### FLOW K — Deleting a Poll

```
[Dashboard]
  → Click "..." menu on poll card
  → "Delete Poll" option
  → Confirmation modal
  → DELETE /api/polls/:pollId
  → Poll + all responses soft-deleted (isDeleted: true)
  → Dashboard refreshes
```

---

## 4. Database Design

### 4.1 Collections Overview

| Collection | Purpose |
|---|---|
| `users` | Auth accounts |
| `polls` | Poll metadata, settings, expiry |
| `questions` | Embedded in polls |
| `responses` | One doc per respondent per poll |
| `answer_items` | Individual answers (sub-doc inside responses) |

---

### 4.2 Schema Definitions (Mongoose + TypeScript)

#### `users` Collection

```typescript
interface IUser {
  _id: ObjectId;
  name: string;                      // Display name
  email: string;                     // Unique, lowercase, indexed
  passwordHash: string;              // bcrypt hash, never returned
  avatarUrl?: string;                // Optional profile picture
  isEmailVerified: boolean;          // Default: false
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  role: 'user' | 'admin';           // Default: 'user'
  isActive: boolean;                 // Soft-disable account
  createdAt: Date;
  updatedAt: Date;
}

// Indexes:
// { email: 1 } UNIQUE
// { passwordResetToken: 1 }
```

#### `polls` Collection

```typescript
interface IOption {
  _id: ObjectId;                     // Auto-generated
  text: string;                      // Option label
  order: number;                     // Display order
}

interface IQuestion {
  _id: ObjectId;
  text: string;                      // Question body
  type: 'single_choice';             // Extensible later
  options: IOption[];                // Min 2, max 10
  isMandatory: boolean;              // Validation flag
  order: number;                     // Display order
}

interface IPoll {
  _id: ObjectId;
  creatorId: ObjectId;               // ref: User
  title: string;                     // Max 200 chars
  description?: string;              // Max 1000 chars
  shareToken: string;                // UUID v4, unique, indexed
  questions: IQuestion[];            // Embedded (max 20 questions)
  responseMode: 'anonymous' | 'authenticated';
  status: 'draft' | 'active' | 'closed' | 'published';
  expiresAt: Date;                   // Required, future date
  totalResponses: number;            // Denormalized counter (inc on submit)
  isDeleted: boolean;                // Soft delete
  publishedAt?: Date;               // Set when status → published
  closedAt?: Date;                  // Set when status → closed
  settings: {
    allowResponseEdit: boolean;      // Default: false (future feature)
    showProgressBar: boolean;        // Default: true
    randomizeQuestions: boolean;     // Default: false
    randomizeOptions: boolean;       // Default: false
  };
  createdAt: Date;
  updatedAt: Date;
}

// Indexes:
// { shareToken: 1 } UNIQUE
// { creatorId: 1, status: 1 }
// { creatorId: 1, createdAt: -1 }
// { expiresAt: 1, status: 1 }     ← used by expiry cron job
// { isDeleted: 1 }
```

#### `responses` Collection

```typescript
interface IAnswerItem {
  questionId: ObjectId;              // Matches poll.questions._id
  selectedOptionId: ObjectId;        // Matches question.options._id
  skipped: boolean;                  // True if optional and unanswered
}

interface IResponse {
  _id: ObjectId;
  pollId: ObjectId;                  // ref: Poll, indexed
  respondentId?: ObjectId;           // ref: User (null if anonymous)
  sessionToken: string;              // UUID for anonymous dedup
  ipHash?: string;                   // SHA-256 of IP (not raw IP)
  userAgent?: string;
  answers: IAnswerItem[];
  isComplete: boolean;               // All mandatory answered
  submittedAt: Date;
  createdAt: Date;
}

// Indexes:
// { pollId: 1, submittedAt: -1 }
// { pollId: 1, respondentId: 1 }  SPARSE   ← prevents duplicate auth responses
// { pollId: 1, sessionToken: 1 }           ← prevents duplicate anon responses
// { pollId: 1, ipHash: 1, submittedAt: 1 } ← rate limiting fallback
```

#### `analytics_snapshots` Collection (Optional - for heavy polls)

```typescript
interface IAnalyticsSnapshot {
  _id: ObjectId;
  pollId: ObjectId;
  snapshotAt: Date;
  totalResponses: number;
  questionStats: {
    questionId: ObjectId;
    optionCounts: {
      optionId: ObjectId;
      count: number;
      percentage: number;
    }[];
    skippedCount: number;
    responseCount: number;
  }[];
  timeSeriesData: {
    hour: Date;
    count: number;
  }[];
  createdAt: Date;
}

// Indexes:
// { pollId: 1, snapshotAt: -1 }
```

---

### 4.3 Schema Relationships Diagram

```
users (1) ──────────────────── (N) polls
                                    │
                               (embedded)
                                    │
                                questions[]
                                    │
                               (embedded)
                                    │
                                 options[]

polls (1) ──────────────────── (N) responses
                                    │
                               (embedded)
                                    │
                                 answers[]

users (1) ──────────────────── (N) responses (respondentId, nullable)
```

---

## 5. Backend Architecture

### 5.1 Server Entry Point — `src/index.ts`

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initializeRoutes } from './routes';
import { initializeSocket } from './socket';
import { startExpiryWatcher } from './jobs/expiryWatcher';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: config.CLIENT_URL, credentials: true }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(requestLogger);

// Rate limiting
app.use('/api/public', rateLimit({ windowMs: 15*60*1000, max: 100 }));
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 20 }));

// Routes
initializeRoutes(app);

// Socket
initializeSocket(io);

// Error handler (must be last)
app.use(errorHandler);

// DB + Server Start
mongoose.connect(config.MONGODB_URI).then(() => {
  httpServer.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
    startExpiryWatcher(); // Start background job
  });
});

export { io }; // Export for use in services
```

---

### 5.2 Complete File Structure

```
backend/
├── src/
│   ├── index.ts                     # Entry point
│   ├── config/
│   │   └── index.ts                 # Config from env
│   ├── models/
│   │   ├── User.model.ts
│   │   ├── Poll.model.ts
│   │   └── Response.model.ts
│   ├── routes/
│   │   ├── index.ts                 # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── poll.routes.ts
│   │   ├── response.routes.ts
│   │   ├── analytics.routes.ts
│   │   └── public.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── poll.controller.ts
│   │   ├── response.controller.ts
│   │   ├── analytics.controller.ts
│   │   └── public.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── poll.service.ts
│   │   ├── response.service.ts
│   │   ├── analytics.service.ts
│   │   ├── token.service.ts
│   │   └── notification.service.ts
│   ├── socket/
│   │   ├── index.ts                 # Socket initialization
│   │   ├── handlers/
│   │   │   ├── poll.handler.ts
│   │   │   └── analytics.handler.ts
│   │   └── events.ts                # Event name constants
│   ├── middleware/
│   │   ├── authenticate.ts          # JWT auth middleware
│   │   ├── optionalAuth.ts          # Auth if token present
│   │   ├── authorize.ts             # Role-based access
│   │   ├── validateRequest.ts       # Zod validation
│   │   ├── errorHandler.ts          # Global error handler
│   │   ├── rateLimiter.ts
│   │   └── requestLogger.ts
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── poll.validator.ts
│   │   └── response.validator.ts
│   ├── jobs/
│   │   └── expiryWatcher.ts         # Cron-based expiry checker
│   ├── utils/
│   │   ├── ApiError.ts
│   │   ├── ApiResponse.ts
│   │   ├── asyncHandler.ts
│   │   ├── hashIp.ts
│   │   ├── generateToken.ts
│   │   └── buildAnalytics.ts
│   └── types/
│       ├── express.d.ts             # req.user augmentation
│       └── index.ts                 # Shared TS types
├── .env
├── .env.example
├── tsconfig.json
└── package.json
```

---

## 6. API Routes — Complete Reference

### Base URLs
- Protected API: `/api/...` — requires JWT
- Public API: `/api/public/...` — no auth required (some optional)

---

### 6.1 Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login, returns JWT |
| POST | `/api/auth/logout` | JWT | Clear session |
| GET | `/api/auth/me` | JWT | Get current user profile |
| PATCH | `/api/auth/me` | JWT | Update profile (name, avatar) |
| PATCH | `/api/auth/me/password` | JWT | Change password |
| POST | `/api/auth/refresh` | Refresh Cookie | Refresh access token |
| POST | `/api/auth/forgot-password` | None | Send reset email |
| POST | `/api/auth/reset-password` | None | Reset with token |

**POST /api/auth/register**
```typescript
// Request Body
{
  name: string;        // 2–60 chars
  email: string;       // valid email
  password: string;    // min 8 chars, 1 uppercase, 1 number
  confirmPassword: string;
}

// Response 201
{
  success: true,
  data: {
    user: { _id, name, email, createdAt },
    accessToken: string,
  }
}
```

**POST /api/auth/login**
```typescript
// Request Body
{ email: string; password: string; }

// Response 200
{
  success: true,
  data: {
    user: { _id, name, email, role },
    accessToken: string,   // 15min expiry
  }
  // Sets httpOnly cookie: refreshToken (7d)
}
```

---

### 6.2 Poll Routes — `/api/polls`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/polls` | JWT | Get creator's polls (paginated) |
| POST | `/api/polls` | JWT | Create new poll |
| GET | `/api/polls/:pollId` | JWT (owner) | Get full poll detail |
| PATCH | `/api/polls/:pollId` | JWT (owner) | Update poll (draft only) |
| DELETE | `/api/polls/:pollId` | JWT (owner) | Soft-delete poll |
| PATCH | `/api/polls/:pollId/publish` | JWT (owner) | Publish results |
| PATCH | `/api/polls/:pollId/close` | JWT (owner) | Manually close poll |
| PATCH | `/api/polls/:pollId/reopen` | JWT (owner) | Reopen if not expired |
| GET | `/api/polls/:pollId/share-link` | JWT (owner) | Get/regenerate share link |
| POST | `/api/polls/:pollId/regenerate-token` | JWT (owner) | New share token |

**POST /api/polls — Request Body**
```typescript
{
  title: string;           // 3–200 chars, required
  description?: string;    // max 1000 chars
  expiresAt: string;       // ISO date string, must be future
  responseMode: 'anonymous' | 'authenticated';
  settings?: {
    showProgressBar?: boolean;
    randomizeQuestions?: boolean;
    randomizeOptions?: boolean;
  };
  questions: {
    text: string;          // 3–500 chars
    isMandatory: boolean;
    options: {
      text: string;        // 1–200 chars
    }[];                   // min 2, max 10 options
  }[];                     // min 1, max 20 questions
}
```

**POST /api/polls — Response 201**
```typescript
{
  success: true,
  data: {
    poll: IPoll,
    shareLink: string,     // https://domain.com/p/:shareToken
  }
}
```

**GET /api/polls — Query Params**
```typescript
{
  page?: number;           // default 1
  limit?: number;          // default 10, max 50
  status?: 'draft' | 'active' | 'closed' | 'published' | 'all';
  search?: string;         // search by title
  sortBy?: 'createdAt' | 'totalResponses' | 'expiresAt';
  sortOrder?: 'asc' | 'desc';
}

// Response 200
{
  success: true,
  data: {
    polls: IPoll[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
      hasNext: boolean,
      hasPrev: boolean,
    }
  }
}
```

---

### 6.3 Analytics Routes — `/api/polls/:pollId/analytics`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/polls/:pollId/analytics` | JWT (owner) | Full analytics object |
| GET | `/api/polls/:pollId/analytics/summary` | JWT (owner) | Quick stats (count, rate) |
| GET | `/api/polls/:pollId/analytics/questions/:questionId` | JWT (owner) | Single question breakdown |
| GET | `/api/polls/:pollId/analytics/timeline` | JWT (owner) | Responses over time |
| GET | `/api/polls/:pollId/analytics/respondents` | JWT (owner) | Respondent list (auth mode only) |
| GET | `/api/polls/:pollId/analytics/export` | JWT (owner) | Export as CSV/JSON |

**GET /api/polls/:pollId/analytics — Response**
```typescript
{
  success: true,
  data: {
    pollId: string,
    pollTitle: string,
    status: string,
    expiresAt: Date,
    totalResponses: number,
    completionRate: number,       // % of respondents who answered all mandatory
    anonymousCount: number,
    authenticatedCount: number,
    avgCompletionTime?: number,   // seconds (future)
    questions: {
      questionId: string,
      questionText: string,
      isMandatory: boolean,
      responseCount: number,
      skippedCount: number,
      options: {
        optionId: string,
        optionText: string,
        count: number,
        percentage: number,
      }[],
      topOption: {
        optionId: string,
        optionText: string,
        count: number,
      }
    }[],
    timeline: {
      date: string,               // ISO date
      count: number,
    }[],
    wordCloudData: {
      text: string,
      value: number,
    }[],
  }
}
```

---

### 6.4 Public Routes — `/api/public`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/public/polls/:shareToken` | None | Get poll for response form |
| POST | `/api/public/polls/:shareToken/respond` | Conditional | Submit response |
| GET | `/api/public/polls/:shareToken/results` | None | View published results |
| GET | `/api/public/polls/:shareToken/status` | None | Quick status check |

**GET /api/public/polls/:shareToken — Response**
```typescript
// Returns sanitized poll (no internal IDs leakage)
{
  success: true,
  data: {
    pollId: string,
    title: string,
    description?: string,
    responseMode: 'anonymous' | 'authenticated',
    status: 'active' | 'closed' | 'published' | 'expired',
    expiresAt: Date,
    totalResponses: number,        // shown publicly
    requiresAuth: boolean,
    alreadyResponded: boolean,     // based on cookie/JWT
    settings: {
      showProgressBar: boolean,
      randomizeQuestions: boolean,
      randomizeOptions: boolean,
    },
    questions: {
      questionId: string,
      text: string,
      isMandatory: boolean,
      order: number,
      options: {
        optionId: string,
        text: string,
        order: number,
      }[]
    }[]
  }
}
```

**POST /api/public/polls/:shareToken/respond — Request**
```typescript
{
  sessionToken: string;            // UUID generated client-side (for anon dedup)
  answers: {
    questionId: string;
    selectedOptionId: string | null;  // null = skipped (must be optional)
  }[];
}

// Headers (authenticated mode):
// Authorization: Bearer <JWT>

// Response 201
{
  success: true,
  data: {
    responseId: string,
    message: "Response submitted successfully",
    totalResponses: number,        // updated count
  }
}
```

---

### 6.5 Response Routes — `/api/responses`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/polls/:pollId/responses` | JWT (owner) | All responses for a poll |
| GET | `/api/polls/:pollId/responses/:responseId` | JWT (owner) | Single response detail |
| DELETE | `/api/polls/:pollId/responses/:responseId` | JWT (owner) | Remove a response |

---

## 7. Service Layer

### 7.1 AuthService — `src/services/auth.service.ts`

```typescript
class AuthService {

  /**
   * Register a new user.
   * Hashes password, creates user doc, generates tokens.
   */
  async register(dto: RegisterDTO): Promise<AuthResult>

  /**
   * Authenticate a user by email + password.
   * Returns access token (short-lived) + refresh token (long-lived).
   */
  async login(dto: LoginDTO): Promise<AuthResult>

  /**
   * Validate a JWT access token.
   * Throws UnauthorizedError if invalid or expired.
   */
  async validateAccessToken(token: string): Promise<JwtPayload>

  /**
   * Issue a new access token from a valid refresh token.
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair>

  /**
   * Initiate password reset. Generates secure token, stores hash.
   * Sends email (via EmailService).
   */
  async forgotPassword(email: string): Promise<void>

  /**
   * Complete password reset. Validates token, updates password.
   */
  async resetPassword(token: string, newPassword: string): Promise<void>

  /**
   * Update user profile fields (name, avatarUrl).
   */
  async updateProfile(userId: string, dto: UpdateProfileDTO): Promise<IUser>

  /**
   * Change password after verifying current password.
   */
  async changePassword(userId: string, current: string, newPass: string): Promise<void>
}
```

---

### 7.2 PollService — `src/services/poll.service.ts`

```typescript
class PollService {

  /**
   * Create a new poll.
   * Generates shareToken (UUID v4).
   * Sets status to 'active' (or 'draft' if expiresAt is far future).
   * Returns poll + shareLink.
   */
  async createPoll(creatorId: string, dto: CreatePollDTO): Promise<{ poll: IPoll; shareLink: string }>

  /**
   * Fetch all polls for a creator with filters, pagination, sorting.
   */
  async getPollsByCreator(
    creatorId: string,
    filters: PollFilters,
    pagination: Pagination
  ): Promise<PaginatedResult<IPoll>>

  /**
   * Fetch a single poll by ID. Validates ownership.
   */
  async getPollById(pollId: string, requesterId: string): Promise<IPoll>

  /**
   * Update a draft poll. Throws if poll has responses.
   * Recalculates question/option IDs on question restructure.
   */
  async updatePoll(pollId: string, requesterId: string, dto: UpdatePollDTO): Promise<IPoll>

  /**
   * Soft-delete a poll. Marks isDeleted = true.
   * Does NOT delete responses (for audit trail).
   */
  async deletePoll(pollId: string, requesterId: string): Promise<void>

  /**
   * Close a poll early (status → 'closed').
   * Emits socket event: 'poll-closed'.
   */
  async closePoll(pollId: string, requesterId: string): Promise<IPoll>

  /**
   * Publish results. Sets status → 'published', sets publishedAt.
   * Emits socket event: 'poll-published'.
   * Poll must be closed or expired.
   */
  async publishResults(pollId: string, requesterId: string): Promise<IPoll>

  /**
   * Get poll by shareToken for public access.
   * Returns sanitized version (no internal fields).
   * Checks expiry and auto-closes if past expiresAt.
   */
  async getPollByShareToken(
    shareToken: string,
    requesterId?: string,
    sessionToken?: string
  ): Promise<PublicPollDTO>

  /**
   * Regenerate share token. Invalidates old link.
   */
  async regenerateShareToken(pollId: string, requesterId: string): Promise<string>

  /**
   * Check and update expiry status for a given poll.
   * Called by cron job and on-demand.
   */
  async checkAndExpirePoll(pollId: string): Promise<boolean>

  /**
   * Expire all polls past their expiresAt date.
   * Called by background cron job every minute.
   */
  async expireOverduePolls(): Promise<number>  // returns count expired
}
```

---

### 7.3 ResponseService — `src/services/response.service.ts`

```typescript
class ResponseService {

  /**
   * Submit a response to a poll.
   * Validates:
   *   - Poll is active and not expired
   *   - Response mode matches auth state
   *   - No duplicate submission (by respondentId or sessionToken)
   *   - All mandatory questions are answered
   *   - All questionIds and optionIds exist in the poll
   *   - No extra questions answered
   * 
   * On success:
   *   - Creates Response doc
   *   - Increments poll.totalResponses (atomic)
   *   - Emits socket event: 'new-response' to poll room
   *   - Emits socket event: 'analytics-update' with fresh stats
   */
  async submitResponse(
    shareToken: string,
    dto: SubmitResponseDTO,
    respondentId?: string
  ): Promise<IResponse>

  /**
   * Check if a user/session has already responded to a poll.
   */
  async hasAlreadyResponded(
    pollId: string,
    respondentId?: string,
    sessionToken?: string
  ): Promise<boolean>

  /**
   * Get all responses for a poll (paginated). Creator only.
   */
  async getResponsesForPoll(
    pollId: string,
    requesterId: string,
    pagination: Pagination
  ): Promise<PaginatedResult<IResponse>>

  /**
   * Get a single response by ID. Creator only.
   */
  async getResponseById(
    pollId: string,
    responseId: string,
    requesterId: string
  ): Promise<IResponse>

  /**
   * Remove a specific response. Creator only.
   * Decrements poll.totalResponses atomically.
   */
  async deleteResponse(
    pollId: string,
    responseId: string,
    requesterId: string
  ): Promise<void>

  /**
   * Build the session-token-based deduplication cookie value.
   * Used to prevent anonymous double submissions.
   */
  buildSessionCookieKey(pollId: string): string
}
```

---

### 7.4 AnalyticsService — `src/services/analytics.service.ts`

```typescript
class AnalyticsService {

  /**
   * Build complete analytics for a poll.
   * Aggregates responses using MongoDB aggregation pipeline.
   * Returns structured data for dashboard rendering.
   */
  async getFullAnalytics(pollId: string, requesterId: string): Promise<FullAnalyticsDTO>

  /**
   * Fast summary: total count, completion rate, status.
   * Uses denormalized poll.totalResponses for speed.
   */
  async getQuickSummary(pollId: string, requesterId: string): Promise<SummaryDTO>

  /**
   * Per-question breakdown: option counts, percentages.
   * Core aggregation function.
   */
  async getQuestionAnalytics(
    pollId: string,
    questionId: string,
    requesterId: string
  ): Promise<QuestionAnalyticsDTO>

  /**
   * Time-series data: responses grouped by hour/day.
   * Used for participation timeline chart.
   */
  async getTimeline(
    pollId: string,
    requesterId: string,
    groupBy: 'hour' | 'day'
  ): Promise<TimelineDTO[]>

  /**
   * Generate word cloud data from option texts weighted by selection count.
   * Returns array of { text, value } for react-wordcloud.
   */
  async getWordCloudData(pollId: string): Promise<WordCloudItem[]>

  /**
   * Build analytics payload for real-time socket emission.
   * Lightweight version of getFullAnalytics.
   */
  async buildRealtimePayload(pollId: string): Promise<RealtimeAnalyticsDTO>

  /**
   * Export responses as CSV or JSON.
   * Streams data for large result sets.
   */
  async exportResponses(
    pollId: string,
    requesterId: string,
    format: 'csv' | 'json'
  ): Promise<string>  // Returns file path

  /**
   * Get publicly visible results after poll is published.
   */
  async getPublishedResults(shareToken: string): Promise<PublishedResultsDTO>
}
```

**Core MongoDB Aggregation Pipeline (getQuestionAnalytics)**
```typescript
const pipeline = [
  // Stage 1: Match responses for this poll
  { $match: { pollId: new ObjectId(pollId), isComplete: true } },

  // Stage 2: Unwind answers array
  { $unwind: '$answers' },

  // Stage 3: Match specific question
  { $match: { 'answers.questionId': new ObjectId(questionId) } },

  // Stage 4: Group by selectedOptionId, count occurrences
  {
    $group: {
      _id: '$answers.selectedOptionId',
      count: { $sum: 1 },
    }
  },

  // Stage 5: Lookup option text from poll document
  {
    $lookup: {
      from: 'polls',
      let: { optionId: '$_id', pollId: new ObjectId(pollId) },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$pollId'] } } },
        { $unwind: '$questions' },
        { $unwind: '$questions.options' },
        { $match: { $expr: { $eq: ['$questions.options._id', '$$optionId'] } } },
        { $project: { text: '$questions.options.text', _id: 0 } }
      ],
      as: 'optionData'
    }
  },

  // Stage 6: Project final shape
  {
    $project: {
      optionId: '$_id',
      optionText: { $arrayElemAt: ['$optionData.text', 0] },
      count: 1,
    }
  },

  // Stage 7: Sort by count desc
  { $sort: { count: -1 } }
];
```

---

### 7.5 TokenService — `src/services/token.service.ts`

```typescript
class TokenService {

  /**
   * Sign a JWT access token (15min TTL).
   */
  signAccessToken(payload: JwtPayload): string

  /**
   * Sign a JWT refresh token (7d TTL).
   */
  signRefreshToken(payload: JwtPayload): string

  /**
   * Verify and decode an access token.
   * Throws AppError(401) on invalid/expired.
   */
  verifyAccessToken(token: string): JwtPayload

  /**
   * Verify and decode a refresh token.
   */
  verifyRefreshToken(token: string): JwtPayload

  /**
   * Generate a cryptographically secure random token.
   * Used for: password reset, email verification.
   */
  generateSecureToken(): string

  /**
   * Hash a token for storage (SHA-256).
   * Never store raw tokens in DB.
   */
  hashToken(token: string): string
}
```

---

## 8. WebSocket Implementation

### 8.1 Socket Architecture

```
CLIENT                                    SERVER
  │                                          │
  │── connect ──────────────────────────────>│
  │                                          │ verify JWT from handshake
  │<─ connected ─────────────────────────────│
  │                                          │
  │── join-poll-room { pollId } ────────────>│ join room: `poll:${pollId}`
  │<─ joined-room ───────────────────────────│
  │                                          │
  │                [new response submitted]  │
  │<─ new-response { totalResponses } ───────│ broadcast to `poll:${pollId}`
  │<─ analytics-update { questionStats } ────│ broadcast to `poll:${pollId}`
  │                                          │
  │── leave-poll-room { pollId } ───────────>│ leave room
  │                                          │
  │                [poll expires/published]  │
  │<─ poll-status-change { status } ─────────│ broadcast to `poll:${pollId}`
```

---

### 8.2 Socket Initialization — `src/socket/index.ts`

```typescript
import { Server } from 'socket.io';
import { verifySocketToken } from './middleware/socketAuth';
import { registerPollHandlers } from './handlers/poll.handler';
import { registerAnalyticsHandlers } from './handlers/analytics.handler';

export function initializeSocket(io: Server): void {
  // Socket auth middleware
  io.use(verifySocketToken);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} | user: ${socket.data.userId || 'anonymous'}`);

    registerPollHandlers(io, socket);
    registerAnalyticsHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
```

---

### 8.3 Socket Auth Middleware — `src/socket/middleware/socketAuth.ts`

```typescript
import { Socket } from 'socket.io';
import { tokenService } from '../../services/token.service';

export const verifySocketToken = (socket: Socket, next: Function) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(' ')[1];

  if (token) {
    try {
      const payload = tokenService.verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
    } catch {
      // Anonymous socket — still allowed, just no userId
      socket.data.userId = null;
    }
  }
  next();  // Always allow connection; auth checked per-event
};
```

---

### 8.4 Poll Handler — `src/socket/handlers/poll.handler.ts`

```typescript
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { pollService } from '../../services/poll.service';

export function registerPollHandlers(io: Server, socket: Socket): void {

  /**
   * JOIN_POLL_ROOM
   * Creator or respondent joins the socket room for a poll.
   * Room key: `poll:${pollId}`
   */
  socket.on(SOCKET_EVENTS.JOIN_POLL_ROOM, async ({ pollId }: { pollId: string }) => {
    if (!pollId) return;
    const roomKey = `poll:${pollId}`;
    socket.join(roomKey);
    socket.emit(SOCKET_EVENTS.JOINED_ROOM, { pollId, roomKey });
  });

  /**
   * LEAVE_POLL_ROOM
   * Leave a poll room explicitly.
   */
  socket.on(SOCKET_EVENTS.LEAVE_POLL_ROOM, ({ pollId }: { pollId: string }) => {
    socket.leave(`poll:${pollId}`);
  });
}
```

---

### 8.5 Analytics Handler — `src/socket/handlers/analytics.handler.ts`

```typescript
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';
import { analyticsService } from '../../services/analytics.service';

export function registerAnalyticsHandlers(io: Server, socket: Socket): void {

  /**
   * REQUEST_ANALYTICS_UPDATE
   * Client asks for a fresh analytics push (e.g., on initial load).
   */
  socket.on(
    SOCKET_EVENTS.REQUEST_ANALYTICS,
    async ({ pollId }: { pollId: string }) => {
      if (!pollId) return;
      try {
        const payload = await analyticsService.buildRealtimePayload(pollId);
        socket.emit(SOCKET_EVENTS.ANALYTICS_UPDATE, payload);
      } catch (err) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to fetch analytics' });
      }
    }
  );
}
```

---

### 8.6 Event Constants — `src/socket/events.ts`

```typescript
export const SOCKET_EVENTS = {
  // Room management
  JOIN_POLL_ROOM: 'join-poll-room',
  LEAVE_POLL_ROOM: 'leave-poll-room',
  JOINED_ROOM: 'joined-room',

  // Broadcast events (server → clients)
  NEW_RESPONSE: 'new-response',
  ANALYTICS_UPDATE: 'analytics-update',
  POLL_STATUS_CHANGE: 'poll-status-change',
  POLL_CLOSED: 'poll-closed',
  POLL_PUBLISHED: 'poll-published',

  // Client requests
  REQUEST_ANALYTICS: 'request-analytics-update',

  // Error
  ERROR: 'socket-error',
} as const;
```

---

### 8.7 Emitting Events from ResponseService

```typescript
// Inside ResponseService.submitResponse(), after successful save:
import { io } from '../index';
import { SOCKET_EVENTS } from '../socket/events';

// Emit to poll room
io.to(`poll:${pollId}`).emit(SOCKET_EVENTS.NEW_RESPONSE, {
  pollId,
  totalResponses: updatedPoll.totalResponses,
  timestamp: new Date().toISOString(),
});

// Build and emit fresh analytics
const realtimePayload = await analyticsService.buildRealtimePayload(pollId.toString());
io.to(`poll:${pollId}`).emit(SOCKET_EVENTS.ANALYTICS_UPDATE, realtimePayload);
```

---

### 8.8 Frontend Socket Hook — `src/hooks/usePollSocket.ts`

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export function usePollSocket(
  pollId: string,
  onAnalyticsUpdate: (data: RealtimeAnalyticsDTO) => void,
  onNewResponse: (data: { totalResponses: number }) => void,
  onStatusChange?: (data: { status: string }) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!pollId) return;

    const socket = io(process.env.REACT_APP_SOCKET_URL!, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-poll-room', { pollId });
    });

    socket.on('analytics-update', onAnalyticsUpdate);
    socket.on('new-response', onNewResponse);
    if (onStatusChange) socket.on('poll-status-change', onStatusChange);

    return () => {
      socket.emit('leave-poll-room', { pollId });
      socket.disconnect();
    };
  }, [pollId, accessToken]);

  return socketRef.current;
}
```

---

## 9. Middleware

### 9.1 authenticate.ts

```typescript
export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) throw new AppError('Authentication required', 401);

  const payload = tokenService.verifyAccessToken(token);
  const user = await User.findById(payload.userId).select('-passwordHash');

  if (!user || !user.isActive) throw new AppError('User not found or disabled', 401);

  req.user = user;
  next();
});
```

### 9.2 optionalAuth.ts

```typescript
// Attaches user to req if token present, but does not block if absent.
// Used for public poll routes (authenticated response mode check).
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const payload = tokenService.verifyAccessToken(token);
      const user = await User.findById(payload.userId).select('-passwordHash');
      if (user && user.isActive) req.user = user;
    } catch { /* ignore */ }
  }
  next();
});
```

### 9.3 validateRequest.ts

```typescript
import { z, ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) =>
  asyncHandler(async (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new AppError('Validation failed', 422, errors);
    }

    req.body = result.data.body;
    next();
  });
```

### 9.4 errorHandler.ts

```typescript
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(err.errors && { errors: err.errors }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      }
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      error: { message: 'Database validation failed', details: err.message }
    });
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    return res.status(409).json({
      success: false,
      error: { message: 'Duplicate entry detected' }
    });
  }

  // Generic
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: { message: 'Internal server error' }
  });
};
```

---

## 10. Validation Layer

### 10.1 Poll Validator — `src/validators/poll.validator.ts`

```typescript
import { z } from 'zod';

const optionSchema = z.object({
  text: z.string().min(1, 'Option text required').max(200, 'Option too long'),
});

const questionSchema = z.object({
  text: z.string().min(3, 'Question too short').max(500, 'Question too long'),
  isMandatory: z.boolean(),
  options: z
    .array(optionSchema)
    .min(2, 'At least 2 options required')
    .max(10, 'Maximum 10 options allowed'),
});

export const createPollSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title too short').max(200, 'Title too long'),
    description: z.string().max(1000).optional(),
    expiresAt: z
      .string()
      .datetime()
      .refine(val => new Date(val) > new Date(), 'Expiry must be in the future'),
    responseMode: z.enum(['anonymous', 'authenticated']),
    questions: z
      .array(questionSchema)
      .min(1, 'At least 1 question required')
      .max(20, 'Maximum 20 questions allowed'),
    settings: z.object({
      showProgressBar: z.boolean().default(true),
      randomizeQuestions: z.boolean().default(false),
      randomizeOptions: z.boolean().default(false),
    }).optional(),
  }),
});
```

### 10.2 Response Validator — `src/validators/response.validator.ts`

```typescript
export const submitResponseSchema = z.object({
  body: z.object({
    sessionToken: z.string().uuid('Invalid session token'),
    answers: z.array(
      z.object({
        questionId: z.string().length(24, 'Invalid question ID'),
        selectedOptionId: z.string().length(24).nullable(),
      })
    ).min(1, 'At least one answer required'),
  }),
  params: z.object({
    shareToken: z.string().uuid('Invalid share token'),
  }),
});
```

### 10.3 Backend Response Validation Logic

```typescript
// In ResponseService.submitResponse() — deep validation
async function validateAnswers(poll: IPoll, answers: AnswerDTO[]): void {

  const questionMap = new Map(poll.questions.map(q => [q._id.toString(), q]));

  // 1. Check for unknown questionIds
  for (const answer of answers) {
    if (!questionMap.has(answer.questionId)) {
      throw new AppError(`Unknown questionId: ${answer.questionId}`, 400);
    }
  }

  const answeredIds = new Set(answers.map(a => a.questionId));

  // 2. Check mandatory questions are answered
  for (const question of poll.questions) {
    if (question.isMandatory && !answeredIds.has(question._id.toString())) {
      throw new AppError(`Question "${question.text}" is mandatory`, 400);
    }
  }

  // 3. Check optionIds are valid for each question
  for (const answer of answers) {
    if (answer.selectedOptionId === null) continue; // skipped optional
    const question = questionMap.get(answer.questionId)!;
    const validOptionIds = new Set(question.options.map(o => o._id.toString()));
    if (!validOptionIds.has(answer.selectedOptionId)) {
      throw new AppError(`Invalid optionId for question "${question.text}"`, 400);
    }
  }
}
```

---

## 11. Error Handling Strategy

### 11.1 AppError Class

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: ValidationError[];

  constructor(
    message: string,
    statusCode: number = 500,
    errors?: ValidationError[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### 11.2 ApiResponse Wrapper

```typescript
export class ApiResponse<T> {
  constructor(
    public readonly statusCode: number,
    public readonly data: T,
    public readonly message: string = 'Success'
  ) {}

  send(res: Response): void {
    res.status(this.statusCode).json({
      success: true,
      message: this.message,
      data: this.data,
    });
  }
}
```

### 11.3 AsyncHandler Wrapper

```typescript
export const asyncHandler = (fn: AsyncRequestHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
```

### 11.4 HTTP Error Code Convention

| Code | Meaning | When Used |
|---|---|---|
| 200 | OK | Successful GET |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Valid token, wrong owner |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate response, duplicate email |
| 410 | Gone | Poll expired |
| 422 | Unprocessable | Zod validation failure |
| 429 | Too Many Requests | Rate limiter triggered |
| 500 | Internal Server Error | Unexpected crash |

---

## 12. Security Design

### 12.1 Authentication Flow

```
Register → bcrypt hash(password, 12 rounds) → store in DB
Login → compare plaintext with hash → issue JWT pair
  Access Token: 15 minutes, RS256 or HS256
  Refresh Token: 7 days, stored as httpOnly Secure SameSite=Strict cookie
```

### 12.2 Anonymous Response Deduplication

```
1. Client generates UUID v4 sessionToken before form render
2. Stored in localStorage under key: `pollcraft_session_${pollId}`
3. Sent with response submission
4. Server: checks Response collection for { pollId, sessionToken }
5. If found → 409 Conflict "Already submitted"
6. Also hash IP address (SHA-256) for secondary dedup signal
7. NEVER store raw IP address (privacy compliance)
```

### 12.3 Security Checklist

| Risk | Mitigation |
|---|---|
| Brute force login | Rate limit: 5 attempts / 15 min per IP |
| JWT theft | Short TTL (15min), httpOnly refresh cookies |
| Mass response spam | Rate limit public respond endpoint: 3 per IP per poll |
| Poll scraping | Share token is UUID (128-bit entropy), not sequential ID |
| XSS | Helmet CSP headers, sanitize all text inputs |
| NoSQL injection | Mongoose ODM parameter binding, Zod schema validation |
| CORS | Restrict to known frontend origins only |
| Sensitive data leak | Exclude passwordHash from all API responses |
| IDOR | All private routes check creatorId === req.user._id |

---

## 13. Analytics Engine

### 13.1 Aggregation Functions Summary

```typescript
// 1. Total response count (fast — use denormalized field)
poll.totalResponses

// 2. Option distribution per question
db.responses.aggregate([
  { $match: { pollId, isComplete: true } },
  { $unwind: '$answers' },
  { $match: { 'answers.questionId': questionId } },
  { $group: { _id: '$answers.selectedOptionId', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// 3. Response timeline (by hour)
db.responses.aggregate([
  { $match: { pollId } },
  { $group: {
      _id: {
        year: { $year: '$submittedAt' },
        month: { $month: '$submittedAt' },
        day: { $dayOfMonth: '$submittedAt' },
        hour: { $hour: '$submittedAt' },
      },
      count: { $sum: 1 }
  }},
  { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
])

// 4. Anonymous vs authenticated split
db.responses.aggregate([
  { $match: { pollId } },
  { $group: {
      _id: { $cond: [{ $ifNull: ['$respondentId', false] }, 'authenticated', 'anonymous'] },
      count: { $sum: 1 }
  }}
])

// 5. Completion rate: how many answered ALL mandatory questions
// → Count responses where isComplete = true / total responses
```

---

## 14. Poll Expiry System

### 14.1 Background Job — `src/jobs/expiryWatcher.ts`

```typescript
import cron from 'node-cron';
import { Poll } from '../models/Poll.model';
import { io } from '../index';
import { SOCKET_EVENTS } from '../socket/events';

export function startExpiryWatcher(): void {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find all active polls that have expired
      const expiredPolls = await Poll.find({
        status: 'active',
        expiresAt: { $lte: now },
        isDeleted: false,
      }).select('_id');

      if (expiredPolls.length === 0) return;

      const expiredIds = expiredPolls.map(p => p._id);

      // Bulk update to 'closed'
      await Poll.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: 'closed', closedAt: now } }
      );

      // Notify connected clients via WebSocket
      for (const poll of expiredPolls) {
        io.to(`poll:${poll._id}`).emit(SOCKET_EVENTS.POLL_STATUS_CHANGE, {
          pollId: poll._id.toString(),
          status: 'closed',
          reason: 'expired',
          closedAt: now.toISOString(),
        });
      }

      console.log(`[ExpiryWatcher] Expired ${expiredPolls.length} polls`);
    } catch (err) {
      console.error('[ExpiryWatcher] Error:', err);
    }
  });

  console.log('[ExpiryWatcher] Started — checking every minute');
}
```

### 14.2 On-Demand Expiry Check

```typescript
// Called inside getPollByShareToken before returning poll to respondent
async checkAndExpirePoll(poll: IPoll): Promise<IPoll> {
  if (poll.status === 'active' && new Date() > poll.expiresAt) {
    return await Poll.findByIdAndUpdate(
      poll._id,
      { $set: { status: 'closed', closedAt: new Date() } },
      { new: true }
    )!;
  }
  return poll;
}
```

---

## 15. Word Cloud Implementation

### 15.1 Backend — Data Generation

```typescript
// In AnalyticsService.getWordCloudData()
async getWordCloudData(pollId: string): Promise<WordCloudItem[]> {

  // Aggregate option selections across all questions
  const results = await Response.aggregate([
    { $match: { pollId: new ObjectId(pollId), isComplete: true } },
    { $unwind: '$answers' },
    { $match: { 'answers.selectedOptionId': { $ne: null } } },
    {
      $group: {
        _id: '$answers.selectedOptionId',
        count: { $sum: 1 }
      }
    }
  ]);

  // Fetch poll to get option texts
  const poll = await Poll.findById(pollId).lean();
  if (!poll) return [];

  const optionTextMap = new Map<string, string>();
  for (const question of poll.questions) {
    for (const option of question.options) {
      optionTextMap.set(option._id.toString(), option.text);
    }
  }

  // Build word cloud items
  const wordCloudItems: WordCloudItem[] = results
    .map(r => ({
      text: optionTextMap.get(r._id.toString()) || '',
      value: r.count,
    }))
    .filter(item => item.text.length > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50); // Cap at 50 words for performance

  return wordCloudItems;
}
```

### 15.2 Frontend — Word Cloud Component

```typescript
// Install: npm install react-wordcloud (or d3-cloud)
import ReactWordcloud from 'react-wordcloud';

const options = {
  rotations: 2,
  rotationAngles: [-90, 0] as [number, number],
  fontSizes: [14, 60] as [number, number],
  fontFamily: 'Inter, sans-serif',
  padding: 2,
  spiral: 'archimedean',
  scale: 'sqrt',
  transitionDuration: 500,
};

const callbacks = {
  getWordColor: (word: Word) => {
    // Color by frequency tier
    if (word.value > 20) return '#6366f1';      // indigo - high
    if (word.value > 10) return '#8b5cf6';      // purple - medium
    return '#a78bfa';                            // light purple - low
  },
};

export function PollWordCloud({ words }: { words: WordCloudItem[] }) {
  return (
    <div className="h-64 w-full">
      <ReactWordcloud
        words={words}
        options={options}
        callbacks={callbacks}
      />
    </div>
  );
}
```

---

## 16. Environment & Configuration

### 16.1 Backend `.env`

```bash
# Server
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/pollcraft

# JWT
JWT_ACCESS_SECRET=your_access_secret_min_64_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_64_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cookie
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false   # true in production

# App
APP_BASE_URL=http://localhost:5000
FRONTEND_BASE_URL=http://localhost:3000
```

### 16.2 Frontend `.env`

```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_BASE_URL=http://localhost:3000
```

---

## 17. Folder Structure

### 17.1 Backend (`/backend`)

```
backend/
├── src/
│   ├── index.ts
│   ├── config/index.ts
│   ├── models/
│   │   ├── User.model.ts
│   │   ├── Poll.model.ts
│   │   └── Response.model.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── poll.routes.ts
│   │   ├── analytics.routes.ts
│   │   ├── response.routes.ts
│   │   └── public.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── poll.controller.ts
│   │   ├── analytics.controller.ts
│   │   ├── response.controller.ts
│   │   └── public.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── poll.service.ts
│   │   ├── response.service.ts
│   │   ├── analytics.service.ts
│   │   └── token.service.ts
│   ├── socket/
│   │   ├── index.ts
│   │   ├── events.ts
│   │   ├── middleware/socketAuth.ts
│   │   └── handlers/
│   │       ├── poll.handler.ts
│   │       └── analytics.handler.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── optionalAuth.ts
│   │   ├── validateRequest.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── requestLogger.ts
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── poll.validator.ts
│   │   └── response.validator.ts
│   ├── jobs/
│   │   └── expiryWatcher.ts
│   └── utils/
│       ├── AppError.ts
│       ├── ApiResponse.ts
│       ├── asyncHandler.ts
│       └── helpers.ts
└── package.json

```

### 17.2 Frontend (`/frontend`)

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx                      # Routes config
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx
│   │   ├── polls/
│   │   │   ├── CreatePoll.tsx
│   │   │   ├── EditPoll.tsx
│   │   │   └── Analytics.tsx
│   │   └── public/
│   │       ├── PollForm.tsx
│   │       └── PollResults.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── polls/
│   │   │   ├── PollCard.tsx
│   │   │   ├── QuestionBuilder.tsx
│   │   │   └── OptionBuilder.tsx
│   │   ├── analytics/
│   │   │   ├── OverviewCards.tsx
│   │   │   ├── QuestionChart.tsx
│   │   │   ├── Timeline.tsx
│   │   │   └── WordCloud.tsx
│   │   └── ui/                      # shadcn components
│   ├── hooks/
│   │   ├── usePollSocket.ts
│   │   ├── usePolls.ts
│   │   └── useAnalytics.ts
│   ├── store/
│   │   ├── authStore.ts             # Zustand
│   │   └── pollStore.ts
│   ├── api/
│   │   ├── axios.ts                 # Axios instance + interceptors
│   │   ├── auth.api.ts
│   │   ├── polls.api.ts
│   │   └── public.api.ts
│   └── types/
│       └── index.ts
└── package.json
```

---

## Appendix — Key Dependencies

### Backend

```json
{
  "express": "^4.18",
  "mongoose": "^8.x",
  "socket.io": "^4.7",
  "jsonwebtoken": "^9.x",
  "bcryptjs": "^2.4",
  "zod": "^3.22",
  "node-cron": "^3.0",
  "cors": "^2.8",
  "helmet": "^7.x",
  "express-rate-limit": "^7.x",
  "cookie-parser": "^1.4",
  "uuid": "^9.x",
  "winston": "^3.x"
}
```

### Frontend

```json
{
  "react": "^18",
  "typescript": "^5",
  "react-router-dom": "^6",
  "socket.io-client": "^4.7",
  "axios": "^1.6",
  "zustand": "^4.4",
  "react-hook-form": "^7",
  "zod": "^3.22",
  "@hookform/resolvers": "^3.3",
  "recharts": "^2.x",
  "react-wordcloud": "^1.2",
  "tailwindcss": "^3",
  "@shadcn/ui": "latest",
  "lucide-react": "latest",
  "date-fns": "^3.x",
  "react-hot-toast": "^2.x"
}
```

---

*Document generated for PollCraft Hackathon — Production Architecture Blueprint v1.0*
