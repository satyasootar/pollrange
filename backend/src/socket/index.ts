import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import config from "../config/config.js";

let io: SocketServer;

export function initializeSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-poll", (pollId: string) => {
      socket.join(`poll_${pollId}`);
      console.log(`Socket ${socket.id} joined poll room: poll_${pollId}`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

export function emitAnalyticsUpdate(pollId: string, data: any) {
  if (io) {
    io.to(`poll_${pollId}`).emit("analytics-update", data);
  }
}
