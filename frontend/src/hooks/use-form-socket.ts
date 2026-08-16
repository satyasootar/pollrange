import { useEffect, useRef, useState } from "react";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import { useAuthStore } from "@/store/use-auth-store";

interface FormAnalyticsUpdatePayload {
  formId: string;
  totalResponses: number;
}

interface FormStatusChangePayload {
  formId: string;
  status: string;
  reason?: string;
}

interface UseFormSocketOptions {
  formId: string;
  onAnalyticsUpdate?: (data: FormAnalyticsUpdatePayload) => void;
  onStatusChange?: (data: FormStatusChangePayload) => void;
}

export function useFormSocket({ formId, onAnalyticsUpdate, onStatusChange }: UseFormSocketOptions) {
  const { accessToken } = useAuthStore();
  const handlersRef = useRef({ onAnalyticsUpdate, onStatusChange });
  useEffect(() => {
    handlersRef.current = { onAnalyticsUpdate, onStatusChange };
  });

  const [isConnected, setIsConnected] = useState(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!formId) return;
    const socket = getSocket(accessToken ?? undefined);

    const handleConnect = () => {
      setIsConnected(true);
      if (!joinedRef.current) {
        socket.emit(SOCKET_EVENTS.JOIN_FORM_ROOM, { formId });
        joinedRef.current = true;
      }
    };
    const handleDisconnect = () => {
      setIsConnected(false);
      joinedRef.current = false;
    };
    const handleAnalytics = (data: FormAnalyticsUpdatePayload) =>
      handlersRef.current.onAnalyticsUpdate?.(data);
    const handleStatus = (data: FormStatusChangePayload) =>
      handlersRef.current.onStatusChange?.(data);

    if (socket.connected) handleConnect();
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(SOCKET_EVENTS.FORM_ANALYTICS_UPDATE, handleAnalytics);
    socket.on(SOCKET_EVENTS.FORM_STATUS_CHANGE, handleStatus);

    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_FORM_ROOM, { formId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(SOCKET_EVENTS.FORM_ANALYTICS_UPDATE, handleAnalytics);
      socket.off(SOCKET_EVENTS.FORM_STATUS_CHANGE, handleStatus);
      joinedRef.current = false;
    };
  }, [formId, accessToken]);

  return { isConnected };
}
