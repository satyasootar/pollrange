# PollCraft Backend Implementation Record

This document tracks the progress and architectural standards established for the PollCraft backend.

## 1. Project Foundation
- **Core Stack**: Node.js, Express 5.x, TypeScript, Mongoose.
- **Environment**: Configured with `dotenv` and a centralized `src/config/config.ts`.
- **Dynamic Config**: `BACKEND_URL` support for automatic URI construction across dev/prod environments.
- **Database**: MongoDB connection established with pre-initialization flow in `src/index.ts`.

## 2. Architectural Standards
- **Modular Design**: Each feature lives in `src/modules/[name]` containing its own model, validation, service, controller, and routes.
- **Zod-First Development**: Zod schemas are the source of truth for both validation and TypeScript types (using `z.infer`).
- **Functional Architecture**: Services and controllers use functional exports instead of classes for better tree-shaking and simplicity.
- **Route Centralization**: All routes are unified in `src/routes/index.ts` and prefixed with `/api`.
- **Security**: 
    - CORS implemented to allow specified origins in development (`:5173`, `:5174`) and production.
    - `httpOnly` and `secure` cookie strategies for JWT handling.

## 3. Standardized Response & Error Handling
- **Utilities**:
    - `ApiError`: Standardized error class for status codes and structured errors.
    - `ApiResponse`: Standardized success response wrapper.
- **Middleware**:
    - `errorHandler`: Global middleware that formats all errors into a consistent JSON structure.
    - **Express 5 Support**: Native async error handling is used (no `asyncHandler` wrapper needed).
    - **Zod Integration**: Automatic formatting of Zod issues into readable `400 Bad Request` responses.

## 4. Authentication Module (`/auth`)
- **Core Workflows**:
    - `Register`: Creates user and triggers verification email.
    - `Login`: Standard email/password auth.
    - `Logout`: Invalidates session and clears cookies.
    - `Change Password`: Secure update for logged-in users.
    - **Token Refresh**: Silent token rotation (`POST /refresh-token`) to maintain sessions securely.
- **Social Auth**:
    - **Google OAuth2**: Passport.js integration with stateless JWT generation.
    - **Hybrid Identity**: Auto-linking of Google accounts with existing email accounts.
- **Token Strategy**:
    - **Dual Tokens**: Access and Refresh tokens (JWT).
    - **Dual Delivery**: `httpOnly` cookies (Web) and JSON payload (Mobile/App).
    - **Session Persistence**: Refresh tokens are stored in the database to allow session management and global logout.

## 5. Email & Communication
- **Provider**: Resend SDK integration.
- **Workflows**:
    - **Email Verification**: Token-based verification link sent on signup.
    - **Password Reset**: "Forgot Password" flow with secure reset tokens and expiry.
- **Utility**: `src/utils/mail.ts` follows strict SDK guardrails (idempotency, error handling, camelCase params).

## 6. Implemented Modules (Schemas & Types)
The following modules have been established with full Mongoose/Zod schemas:
- `User`: Identity, verification state, and Google OAuth support.
- `Poll`: Complex poll structures including questions and options.
- `Response`: User answers and metadata.
- `AnalyticsSnapshot`: Aggregated data for real-time dashboards.
- `Session`: Refresh token management and token rotation logic.
- `Notification`: User alerts and system updates.

## 7. Real-Time Poll Engine & Analytics
- **Live Updates**: Socket.io integration with room-based architecture (`poll_${pollId}`).
- **Concurrency Handling**: 
    - Used **Atomic Operators** (`$inc`) via MongoDB `bulkWrite` for vote counting.
    - Prevents race conditions during simultaneous writes from hundreds of users.
- **Analytics**: 
    - Real-time broadcasts (`analytics-update` event) emitted immediately after a response is processed.
    - Sanitized public data access via `shareToken`.

---
**Status**: Authentication, Poll Management, Real-Time Analytics Engine, and E2E Validation are **100% Complete**.

## 9. Frontend Implementation
- **Core Stack**: React 19, Vite, TypeScript, Tailwind CSS v4.
- **State Management**: Zustand with persistence for authentication state.
- **Form Handling**: React Hook Form with Zod validation.
- **UI Components**: Shadcn UI (Radix UI primitives).
- **Authentication UI**:
    - Centralized `AuthModal` with Login, Register, and Forgot Password views.
    - Google OAuth integration.
    - Persistent user sessions via local storage and Axios interceptors.
- **Styling & Design**:
    - Modern Tailwind v4 configuration.
    - Custom typography: Plus Jakarta Sans (Sans), Lora (Serif), Roboto Mono (Mono).
    - Premium color palette and shadow tokens.
- **API Integration**:
    - Centralized Axios instance with base URL and authorization header injection.
    - Error handling for 401 Unauthorized responses.

---
**Status**: Backend core is stable; Frontend authentication and core UI architecture are established.
