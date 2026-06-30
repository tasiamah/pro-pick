import { useMemo, useState } from 'react';

import { useDashboard } from '../api/hooks';
import {
  addLocalDays,
  buildDateRange,
  buildDateRangeEndingAt,
  buildDateWindowParams,
  DATE_RANGE_DAYS,
  localDayKeyToDate,
  resolveMatchAnchorDate,
  toLocalDateKey,
} from '../utils/matchDates';
import { useLocalDayKey } from './useLocalDayKey';

export function useMatchDateAnchor() {
  const dashboardQuery = useDashboard();
  const localDayKey = useLocalDayKey();
  const hasUpcoming = (dashboardQuery.data?.upcoming_matches ?? 0) > 0;
  const anchorDate = useMemo(
    () =>
      resolveMatchAnchorDate(
        dashboardQuery.data?.upcoming_matches ?? 0,
        dashboardQuery.data?.latest_kickoff ?? null,
        localDayKeyToDate(localDayKey),
      ),
    [
      dashboardQuery.data?.latest_kickoff,
      dashboardQuery.data?.upcoming_matches,
      localDayKey,
    ],
  );
  const dateRange = useMemo(() => {
    if (hasUpcoming) {
      return buildDateRange(localDayKeyToDate(localDayKey), DATE_RANGE_DAYS);
    }
    return buildDateRangeEndingAt(anchorDate);
  }, [anchorDate, hasUpcoming, localDayKey]);
  const matchListParams = useMemo(() => {
    const rangeStart = dateRange[0] ?? localDayKeyToDate(localDayKey);
    const rangeEnd = hasUpcoming
      ? addLocalDays(rangeStart, DATE_RANGE_DAYS)
      : addLocalDays(anchorDate, 1);
    return buildDateWindowParams(rangeStart, rangeEnd);
  }, [anchorDate, dateRange, hasUpcoming, localDayKey]);
  const anchorKey = toLocalDateKey(anchorDate);
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
