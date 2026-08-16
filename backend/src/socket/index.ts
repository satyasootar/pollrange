import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { Poll } from "../modules/poll/poll.model.js";
import { Form } from "../modules/form/form.model.js";

let io: SocketServer;

/**
 * Allowed CORS origins for the socket server.
 * A wildcard cannot be combined with credentials, so we mirror the HTTP app CORS.
 */
const allowedOrigins =
  config.ENVIRONMENT === "production"
    ? [config.CLIENT_URL]
    : ["http://localhost:5173", "http://localhost:5174"];

/**
 * Initializes Socket.io with the given HTTP server.
 * Sets up CORS, optional JWT auth, and connection listeners for real-time poll analytics.
 */
export function initializeSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Optional auth: decode the token if present and attach the userId to the socket.
  // Anonymous connections are still allowed (public polls), but room joins are authorized below.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET as string) as { _id: string };
        (socket as any).userId = decoded._id;
      } catch {
        // Invalid token — treat as anonymous rather than rejecting the connection.
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    socket.on("join-poll-room", async ({ pollId }: { pollId: string }) => {
      try {
        const poll = await Poll.findOne({ _id: pollId, isDeleted: false }).select(
          "creatorId isResultsPublic status"
        );
        if (!poll) return;

        const userId = (socket as any).userId as string | undefined;
        const isOwner = userId && poll.creatorId.toString() === userId;
        const isPublic = poll.isResultsPublic || poll.status === "published";

        // Only the owner or viewers of a public poll may subscribe to live updates.
        if (isOwner || isPublic) {
          socket.join(`poll_${pollId}`);
        } else {
          socket.emit("socket-error", { message: "Not authorized to join this poll room" });
        }
      } catch {
        // Ignore malformed pollId / lookup errors.
      }
    });

    socket.on("leave-poll-room", ({ pollId }: { pollId: string }) => {
      socket.leave(`poll_${pollId}`);
    });

    socket.on("join-form-room", async ({ formId }: { formId: string }) => {
      try {
        const form = await Form.findOne({ _id: formId, isDeleted: false }).select(
          "creatorId isResultsPublic status"
        );
        if (!form) return;

        const userId = (socket as any).userId as string | undefined;
        const isOwner = userId && form.creatorId.toString() === userId;
        const isPublic = form.isResultsPublic || form.status === "published";

        if (isOwner || isPublic) {
          socket.join(`form_${formId}`);
        } else {
          socket.emit("socket-error", { message: "Not authorized to join this form room" });
        }
      } catch {
        // Ignore malformed formId / lookup errors.
      }
    });

    socket.on("leave-form-room", ({ formId }: { formId: string }) => {
      socket.leave(`form_${formId}`);
    });
  });

  return io;
}

/**
 * Returns the initialized Socket.io instance.
 * Throws an error if initializeSocket has not been called.
 */
export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

/**
 * Broadcasts an analytics update to all clients joined to a specific poll room.
 */
export function emitAnalyticsUpdate(pollId: string, data: any) {
  if (io) {
    io.to(`poll_${pollId}`).emit("analytics-update", data);
  }
}

/**
 * Broadcasts a poll status change (closed / published / reopened) to a poll room.
 */
export function emitPollStatusChange(
  pollId: string,
  data: { status: string; closedAt?: Date | null | undefined; reason?: string }
) {
  if (io) {
    io.to(`poll_${pollId}`).emit("poll-status-change", { pollId, ...data });
  }
}

/**
 * Broadcasts an analytics update to all clients joined to a specific form room.
 */
export function emitFormAnalyticsUpdate(formId: string, data: any) {
  if (io) {
    io.to(`form_${formId}`).emit("form-analytics-update", data);
  }
}

/**
 * Broadcasts a form status change (closed / published / reopened) to a form room.
 */
export function emitFormStatusChange(
  formId: string,
  data: { status: string; closedAt?: Date | null | undefined; reason?: string }
) {
  if (io) {
    io.to(`form_${formId}`).emit("form-status-change", { formId, ...data });
  }
}
