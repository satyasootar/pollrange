# PollCraft Backend Implementation Record

This document tracks the progress and architectural standards established for the PollCraft backend.

## 1. Project Foundation
- **Core Stack**: Node.js, Express 5.x, TypeScript, Mongoose.
- **Environment**: Configured with `dotenv` and a centralized `src/config/config.ts`.
- **Database**: MongoDB connection established with pre-initialization flow in `src/index.ts`.

## 2. Architectural Standards
- **Modular Design**: Each feature lives in `src/modules/[name]` containing its own model, validation, service, controller, and routes.
- **Zod-First Development**: Zod schemas are the source of truth for both validation and TypeScript types (using `z.infer`).
- **Functional Architecture**: Services and controllers use functional exports instead of classes for better tree-shaking and simplicity.
- **Route Centralization**: All routes are unified in `src/routes/index.ts` and prefixed with `/api`.

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
    - `Logout`: Invalidates session.
    - `Change Password`: Secure update for logged-in users.
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
- `User`: Identity and verification state.
- `Poll`: Complex poll structures including questions and options.
- `Response`: User answers and metadata.
- `AnalyticsSnapshot`: Aggregated data for real-time dashboards.
- `Session`: Refresh token management.
- `Notification`: User alerts and system updates.

---
**Status**: Core infrastructure and Authentication are **Complete**. Ready for Poll management and Analytics logic implementation.
