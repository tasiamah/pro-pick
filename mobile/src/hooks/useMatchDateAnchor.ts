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

export function useMatchDateAnchor(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const dashboardQuery = useDashboard({ enabled });
  const localDayKey = useLocalDayKey();
  const hasUpcoming = (dashboardQuery.data?.upcoming_matches ?? 0) > 0;
  const nextPredictionKickoff = dashboardQuery.data?.next_prediction_kickoff ?? null;
  const anchorDate = useMemo(
    () =>
      resolveMatchAnchorDate(
        dashboardQuery.data?.upcoming_matches ?? 0,
        dashboardQuery.data?.latest_kickoff ?? null,
        localDayKeyToDate(localDayKey),
        nextPredictionKickoff,
      ),
    [
      dashboardQuery.data?.latest_kickoff,
      dashboardQuery.data?.upcoming_matches,
      localDayKey,
      nextPredictionKickoff,
    ],
  );
  // When we have (or expect) upcoming matches, show a forward week starting at
  // the anchor; otherwise fall back to the week ending at the latest fixture.
  const showsForwardWindow = hasUpcoming || nextPredictionKickoff != null;
  const dateRange = useMemo(() => {
    if (showsForwardWindow) {
      return buildDateRange(anchorDate, DATE_RANGE_DAYS);
    }
    return buildDateRangeEndingAt(anchorDate);
  }, [anchorDate, showsForwardWindow]);
  const matchListParams = useMemo(() => {
    const rangeStart = dateRange[0] ?? anchorDate;
    const rangeEnd = showsForwardWindow
      ? addLocalDays(rangeStart, DATE_RANGE_DAYS)
      : addLocalDays(anchorDate, 1);
    return buildDateWindowParams(rangeStart, rangeEnd);
  }, [anchorDate, dateRange, showsForwardWindow]);
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
