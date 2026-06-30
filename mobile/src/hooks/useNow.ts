import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const DEFAULT_TICK_MS = 60_000;

/** Wall-clock time that advances on a fixed interval and whenever the app returns to the foreground. */
export function useNow(tickMs = DEFAULT_TICK_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, tickMs);

    const onAppStateChange = (status: AppStateStatus) => {
      if (status === 'active') {
        tick();
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [tickMs]);

  return now;
}
