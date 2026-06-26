import { useMemo, useState } from 'react';

import { useDashboard } from '../api/hooks';
import {
  addUtcDays,
  buildDateRange,
  buildDateRangeEndingAt,
  buildDateWindowParams,
  DATE_RANGE_DAYS,
  resolveMatchAnchorDate,
  startOfUtcDay,
  toUtcDateKey,
} from '../utils/matchDates';

export function useMatchDateAnchor() {
  const dashboardQuery = useDashboard();
  const hasUpcoming = (dashboardQuery.data?.upcoming_matches ?? 0) > 0;
  const anchorDate = useMemo(
    () =>
      resolveMatchAnchorDate(
        dashboardQuery.data?.upcoming_matches ?? 0,
        dashboardQuery.data?.latest_kickoff ?? null,
      ),
    [dashboardQuery.data?.latest_kickoff, dashboardQuery.data?.upcoming_matches],
  );
  const dateRange = useMemo(() => {
    if (hasUpcoming) {
      return buildDateRange(startOfUtcDay(), DATE_RANGE_DAYS);
    }
    return buildDateRangeEndingAt(anchorDate);
  }, [anchorDate, hasUpcoming]);
  const matchListParams = useMemo(() => {
    const rangeStart = dateRange[0] ?? startOfUtcDay();
    const rangeEnd = hasUpcoming
      ? addUtcDays(rangeStart, DATE_RANGE_DAYS)
      : addUtcDays(anchorDate, 1);
    return buildDateWindowParams(rangeStart, rangeEnd);
  }, [anchorDate, dateRange, hasUpcoming]);
  const anchorKey = toUtcDateKey(anchorDate);
  const [selectedDate, setSelectedDate] = useState(anchorDate);
  const [prevAnchorKey, setPrevAnchorKey] = useState(anchorKey);

  if (anchorKey !== prevAnchorKey) {
    setPrevAnchorKey(anchorKey);
    setSelectedDate(anchorDate);
  }

  return {
    anchorDate,
    dateRange,
    matchListParams,
    selectedDate,
    setSelectedDate,
    dashboardQuery,
  };
}
