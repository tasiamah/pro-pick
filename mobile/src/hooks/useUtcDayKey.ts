import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { startOfUtcDay, toUtcDateKey } from '../utils/matchDates';

function currentUtcDayKey(): string {
  return toUtcDateKey(startOfUtcDay());
}

/** UTC calendar day for date-window queries; refreshes on foreground and manual refresh. */
export function useUtcDayKey() {
  const [utcDayKey, setUtcDayKey] = useState(currentUtcDayKey);

  const refreshUtcDayKey = useCallback(() => {
    setUtcDayKey(currentUtcDayKey());
  }, []);

  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status === 'active') {
        setUtcDayKey(currentUtcDayKey());
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  return { utcDayKey, refreshUtcDayKey };
}
