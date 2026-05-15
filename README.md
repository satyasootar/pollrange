# PollRange

**Capture the Choice of your Audience.**

PollRange is a high-performance, real-time audience engagement platform designed to bridge the gap between question and insight. Whether you're a content creator, a product manager, or an educator, PollRange provides the tools to build sophisticated multi-question polls, share them instantly, and watch responses flow in with live, data-driven analytics.

## 🚀 What is PollRange?

PollRange is more than just a survey tool; it's a real-time feedback engine. It allows users to create interactive polls that support various question types, from single-choice selections to open-ended text responses. The platform is built for speed and reliability, ensuring that as soon as a vote is cast, the results are updated across all active dashboards instantly.

## 🛠️ How it Works

1.  **Create:** Authenticated users can access a powerful dashboard to design multi-step polls. You can customize titles, descriptions, and define various question types.
2.  **Share:** Every poll generates a unique, secure share token. You can distribute this link to your audience across any platform.
3.  **Engage:** Respondents can take the poll in either anonymous or authenticated modes, depending on the creator's settings. The interface is optimized for both desktop and mobile experiences.
4.  **Analyze:** As responses arrive, creators see live updates. The analytics dashboard provides high-level snapshots, completion rates, and advanced visualizations like word clouds for qualitative data.

## 💡 The Problem it Solves

Traditional survey tools often suffer from "data lag"—the time between gathering feedback and being able to act on it. PollRange solves this by:
-   **Eliminating Latency:** Real-time WebSocket integration means you see the data *as it happens*.
-   **Reducing Friction:** No complex setups or bloated interfaces. Creators can go from an idea to a live poll in under a minute.
-   **Ensuring Data Integrity:** Built-in duplicate detection (IP hashing and session tracking) ensures that your analytics reflect unique audience choices.
-   **Providing Visual Clarity:** Instead of raw spreadsheets, PollRange delivers beautiful, instant visualizations that make trends obvious at a glance.

## 💻 Tech Stack

### Frontend
-   **Core:** [React](https://reactjs.org/) with [Vite](https://vitejs.dev/) for lightning-fast development and builds.
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/) and [Shadcn UI](https://ui.shadcn.com/) for a premium, blueprint-style aesthetic.
-   **Animations:** [Framer Motion](https://www.framer.com/motion/) for smooth transitions and micro-interactions.
-   **State Management:** [TanStack Query](https://tanstack.com/query/latest) (React Query) for server-state synchronization and [Zustand](https://github.com/pmndrs/zustand) for client-side store.
-   **Real-time:** [Socket.io-client](https://socket.io/docs/v4/client-api/) for persistent bi-directional communication.
-   **Routing:** [React Router](https://reactrouter.com/) for SPA navigation.

### Backend
-   **Runtime:** [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/) (strictly typed with TypeScript).
-   **Database:** [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) for flexible document modeling.
-   **Authentication:** [Passport.js](http://www.passportjs.org/) with Google OAuth 2.0 and JWT-based session management.
-   **Real-time Server:** [Socket.io](https://socket.io/) for broadcasting analytics updates via a persistent room-based architecture.
-   **Validation:** [Zod](https://zod.dev/) for robust, type-safe schema validation.
-   **Email:** [Resend](https://resend.com/) for transactional emails (verification and password resets).

## 🌐 Deployment
-   **Frontend:** Hosted on [Vercel](https://vercel.com/) for global edge delivery and seamless CI/CD.
-   **Backend:** Hosted on [Render](https://render.com/) as a persistent web service to support stateful WebSocket connections.
