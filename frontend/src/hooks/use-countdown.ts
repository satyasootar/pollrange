import { useEffect, useRef, useState } from "react";

/**
 * Milliseconds left until `endsAt`, measured on the server's clock (`serverTime` is the
 * server's "now" from the last fetch, so a wrong device clock can't stretch a quiz).
 * Calls `onExpire` once when it reaches zero. Returns null with no end, or before the first tick.
 */
export function useCountdown(endsAt: string | undefined, serverTime?: string, onExpire?: () => void): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const skew = serverTime ? new Date(serverTime).getTime() - Date.now() : 0;
    let fired = false;
    const tick = () => {
      const left = Math.max(0, end - (Date.now() + skew));
      setRemaining(left);
      if (left === 0 && !fired) {
        fired = true;
        onExpireRef.current?.();
      }
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 500);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [endsAt, serverTime]);

  return endsAt ? remaining : null;
}
