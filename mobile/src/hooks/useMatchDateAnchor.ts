import { useEffect, useMemo, useState } from 'react';

import { useDashboard } from '../api/hooks';
import {
  addUtcDays,
  buildDateRangeEndingAt,
  buildDateWindowParams,
  resolveMatchAnchorDate,
  startOfUtcDay,
  toUtcDateKey,
} from '../utils/matchDates';

export function useMatchDateAnchor() {
  const dashboardQuery = useDashboard();
  const anchorDate = useMemo(
    () =>
      resolveMatchAnchorDate(
        dashboardQuery.data?.upcoming_matches ?? 0,
        dashboardQuery.data?.latest_kickoff ?? null,
      ),
    [dashboardQuery.data?.latest_kickoff, dashboardQuery.data?.upcoming_matches],
  );
  const dateRange = useMemo(
    () => buildDateRangeEndingAt(anchorDate),
    [anchorDate],
  );
  const matchListParams = useMemo(() => {
    const rangeStart = dateRange[0] ?? startOfUtcDay();
    return buildDateWindowParams(rangeStart, addUtcDays(anchorDate, 1));
  }, [anchorDate, dateRange]);
  const [selectedDate, setSelectedDate] = useState(() => startOfUtcDay());
  const anchorKey = toUtcDateKey(anchorDate);

  useEffect(() => {
    setSelectedDate(anchorDate);
  }, [anchorKey, anchorDate]);

  return {
    anchorDate,
    dateRange,
    matchListParams,
    selectedDate,
    setSelectedDate,
    dashboardQuery,
  };
}
