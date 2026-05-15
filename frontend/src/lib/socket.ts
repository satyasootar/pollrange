import { io, type Socket } from "socket.io-client";
import { config } from "@/config/config";

const SOCKET_URL = config.socketUrl;

let socket: Socket | null = null;

export function getSocket(accessToken?: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: accessToken ? { token: accessToken } : {},
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });

  socket.on("connect_error", (err) => {
    console.warn("[Socket] Connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export const SOCKET_EVENTS = {
  JOIN_POLL_ROOM: "join-poll-room",
  LEAVE_POLL_ROOM: "leave-poll-room",
  REQUEST_ANALYTICS: "request-analytics-update",
  JOINED_ROOM: "joined-room",
  NEW_RESPONSE: "new-response",
  ANALYTICS_UPDATE: "analytics-update",
  POLL_STATUS_CHANGE: "poll-status-change",
  POLL_CLOSED: "poll-closed",
  POLL_PUBLISHED: "poll-published",
  ERROR: "socket-error",
} as const;
