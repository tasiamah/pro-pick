import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { startOfLocalDay, toLocalDateKey } from '../utils/matchDates';

function currentLocalDayKey(): string {
  return toLocalDateKey(startOfLocalDay());
}

/** Local calendar day for date-window queries; refreshes on foreground and manual refresh. */
export function useLocalDayKey() {
  const [localDayKey, setLocalDayKey] = useState(currentLocalDayKey);

  const refreshLocalDayKey = useCallback(() => {
    setLocalDayKey(currentLocalDayKey());
  }, []);

  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status === 'active') {
        setLocalDayKey(currentLocalDayKey());
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  return { localDayKey, refreshLocalDayKey };
}
