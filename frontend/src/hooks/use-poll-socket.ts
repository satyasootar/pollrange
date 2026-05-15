import { useEffect, useRef, useState } from "react";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import type {
  AnalyticsUpdatePayload,
  NewResponsePayload,
  PollStatusChangePayload,
} from "@/types";

interface UsePollSocketOptions {
  pollId: string;
  onAnalyticsUpdate?: (data: AnalyticsUpdatePayload) => void;
  onNewResponse?: (data: NewResponsePayload) => void;
  onStatusChange?: (data: PollStatusChangePayload) => void;
}

export function usePollSocket({
  pollId,
  onAnalyticsUpdate,
  onNewResponse,
  onStatusChange,
}: UsePollSocketOptions) {
  const handlersRef = useRef({ onAnalyticsUpdate, onNewResponse, onStatusChange });
  handlersRef.current = { onAnalyticsUpdate, onNewResponse, onStatusChange };

  const [isConnected, setIsConnected] = useState(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!pollId) return;

    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      if (!joinedRef.current) {
        socket.emit(SOCKET_EVENTS.JOIN_POLL_ROOM, { pollId });
        joinedRef.current = true;
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      joinedRef.current = false;
    };

    const handleAnalyticsUpdate = (data: AnalyticsUpdatePayload) => {
      handlersRef.current.onAnalyticsUpdate?.(data);
    };

    const handleNewResponse = (data: NewResponsePayload) => {
      handlersRef.current.onNewResponse?.(data);
    };

    const handleStatusChange = (data: PollStatusChangePayload) => {
      handlersRef.current.onStatusChange?.(data);
    };

    if (socket.connected) handleConnect();

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(SOCKET_EVENTS.ANALYTICS_UPDATE, handleAnalyticsUpdate);
    socket.on(SOCKET_EVENTS.NEW_RESPONSE, handleNewResponse);
    socket.on(SOCKET_EVENTS.POLL_STATUS_CHANGE, handleStatusChange);

    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_POLL_ROOM, { pollId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(SOCKET_EVENTS.ANALYTICS_UPDATE, handleAnalyticsUpdate);
      socket.off(SOCKET_EVENTS.NEW_RESPONSE, handleNewResponse);
      socket.off(SOCKET_EVENTS.POLL_STATUS_CHANGE, handleStatusChange);
      joinedRef.current = false;
    };
  }, [pollId]);

  return { isConnected };
}
