import { useEffect, useState } from 'react';

/**
 * Re-renders every `intervalMs` while `active` is true and returns the current time.
 * Aligned to whole seconds so the live counter changes in step with the clock.
 */
export function useTicker(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      timer = setTimeout(tick, intervalMs - (t % intervalMs) + 5);
    };
    tick();
    return () => clearTimeout(timer);
  }, [active, intervalMs]);

  return now;
}
