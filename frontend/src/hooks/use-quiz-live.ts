import { useEffect, useRef } from "react";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import { useAuthStore } from "@/store/use-auth-store";
import type { QuizLiveState } from "@/types";

/**
 * Subscribes to a live quiz's shared timer (host start / +time / end). Joins the public
 * quiz room for takers; the host's own form room receives the same event. Pass no formId to stay idle.
 */
export function useQuizLiveSocket(formId: string | undefined, onState: (state: QuizLiveState) => void, joinRoom = true) {
  const { accessToken } = useAuthStore();
  const handlerRef = useRef(onState);
  useEffect(() => {
    handlerRef.current = onState;
  });

  useEffect(() => {
    if (!formId) return;
    const socket = getSocket(accessToken ?? undefined);
    const join = () => joinRoom && socket.emit(SOCKET_EVENTS.JOIN_QUIZ_ROOM, { formId });
    const handle = (data: QuizLiveState) => {
      if (data.formId === formId) handlerRef.current(data);
    };

    if (socket.connected) join();
    // Rooms are lost on reconnect; join again.
    socket.on("connect", join);
    socket.on(SOCKET_EVENTS.QUIZ_LIVE_STATE, handle);
    return () => {
      if (joinRoom) socket.emit(SOCKET_EVENTS.LEAVE_QUIZ_ROOM, { formId });
      socket.off("connect", join);
      socket.off(SOCKET_EVENTS.QUIZ_LIVE_STATE, handle);
    };
  }, [formId, accessToken, joinRoom]);
}

/** Host view: how many takers are waiting in a live quiz's lobby. */
export function useQuizLobbyCount(formId: string | undefined, onCount: (count: number) => void) {
  const { accessToken } = useAuthStore();
  const handlerRef = useRef(onCount);
  useEffect(() => {
    handlerRef.current = onCount;
  });

  useEffect(() => {
    if (!formId) return;
    const socket = getSocket(accessToken ?? undefined);
    const handle = (data: { formId: string; count: number }) => {
      if (data.formId === formId) handlerRef.current(data.count);
    };
    socket.on(SOCKET_EVENTS.QUIZ_LOBBY_COUNT, handle);
    // Joining the form room (idempotent) makes the server send the current count right away.
    const ask = () => socket.emit(SOCKET_EVENTS.JOIN_FORM_ROOM, { formId });
    if (socket.connected) ask();
    socket.on("connect", ask);
    return () => {
      socket.off(SOCKET_EVENTS.QUIZ_LOBBY_COUNT, handle);
      socket.off("connect", ask);
    };
  }, [formId, accessToken]);
}
