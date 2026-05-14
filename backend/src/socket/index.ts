import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "node:http";
import config from "../config/config.js";

let io: SocketServer;

/**
 * Initializes Socket.io with the given HTTP server.
 * Sets up CORS and connection listeners for real-time poll analytics.
 */
export function initializeSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-poll", (pollId: string) => {
      socket.join(`poll_${pollId}`);
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
