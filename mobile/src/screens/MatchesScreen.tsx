import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMatchesInfinite } from '../api/hooks';
import type { MatchListParams } from '../api/types';
import {
  AsyncState,
  ErrorState,
  FilterChipRow,
  MatchCardV2,
  SearchInput,
  SegmentedControl,
} from '../components';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useNow } from '../hooks/useNow';
import { TAB_BAR_BASE_HEIGHT } from '../navigation/tabBarOptions';
import type { MatchesStackParamList } from '../navigation/types';
import { colors, screenStyles, spacing } from '../theme';
import { filterHighConfidenceMatchesWithPicks } from '../utils/marketPicks';
import { addLocalDays, localDayKeyToDate, toLocalDateKey } from '../utils/matchDates';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';
import {
  chunkMatchesGridRows,
  getMatchesGridMetrics,
  getMatchesScrollBottomPadding,
} from './matchesGridLayout';
import {
  filterMatchesForBrowse,
  getMatchesEmptyMessage,
  type MatchOddsTierFilter,
  type MatchStatusFilter,
} from './matchesFilterUtils';

type Props = NativeStackScreenProps<MatchesStackParamList, 'Matches'>;

const SEARCH_DEBOUNCE_MS = 300;
const UPCOMING_BROWSE_WINDOW_DAYS = 14;
/** Completed tab loads further back so recent tournament results stay visible. */
const COMPLETED_BROWSE_WINDOW_DAYS = 90;
const MATCHES_PAGE_LIMIT = 50;
/**
 * Completed loads in small pages so the first results paint quickly and the
 * rest stream in on a background fetch instead of one large 200-row request.
 */
const COMPLETED_MATCHES_PAGE_SIZE = 30;
const LIVE_REFETCH_INTERVAL_MS = 60_000;
const KICKOFF_GUARD_EPOCH = new Date(0);

export function MatchesScreen({ navigation }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const gridMetrics = useMemo(() => getMatchesGridMetrics(windowWidth), [windowWidth]);
  const scrollBottomPadding = useMemo(
    () =>
      getMatchesScrollBottomPadding(
        TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, spacing.sm),
      ),
    [insets.bottom],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('upcoming');
  const [oddsTierFilter, setOddsTierFilter] = useState<MatchOddsTierFilter>('all');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const now = useNow();
  const localDayKey = toLocalDateKey(now);
  const kickoffGuardNow = statusFilter === 'upcoming' ? now : KICKOFF_GUARD_EPOCH;

  const matchListParams = useMemo(() => {
    const today = localDayKeyToDate(localDayKey);
    const browseWindowDays =
      statusFilter === 'completed'
        ? COMPLETED_BROWSE_WINDOW_DAYS
        : UPCOMING_BROWSE_WINDOW_DAYS;
    const start = addLocalDays(today, -browseWindowDays);
    const end =
      statusFilter === 'completed'
        ? addLocalDays(today, 1)
        : addLocalDays(today, UPCOMING_BROWSE_WINDOW_DAYS);

    const params: MatchListParams = {
      kickoff_from: start.toISOString(),
      kickoff_to: end.toISOString(),
      limit:
        statusFilter === 'completed'
          ? COMPLETED_MATCHES_PAGE_SIZE
          : MATCHES_PAGE_LIMIT,
      status: statusFilter,
    };

    const trimmedQuery = debouncedSearchQuery.trim();
    if (trimmedQuery) {
      params.q = trimmedQuery;
    }
    if (oddsTierFilter !== 'all') {
      params.odds_tier = oddsTierFilter;
    }

    return params;
  }, [debouncedSearchQuery, localDayKey, oddsTierFilter, statusFilter]);

  const matchesQuery = useMatchesInfinite(matchListParams, {
    enabled: isFocused,
    keepPreviousData: true,
    refetchInterval:
      isFocused && statusFilter === 'live' ? LIVE_REFETCH_INTERVAL_MS : false,
  });

  const {
    data: matchesData,
    error: matchesError,
    isLoading: isMatchesQueryLoading,
    isRefetching: isMatchesRefetching,
    isPlaceholderData: isMatchesPlaceholderData,
    refetch: refetchMatches,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = matchesQuery;

  const matches = useMemo(
    () => matchesData?.pages.flat() ?? [],
    [matchesData],
  );

  // After the first page renders, keep pulling remaining pages in the
  // background so the full list fills in without blocking the initial paint.
  // Guarded against placeholder data so a filter switch doesn't paginate the
  // previous tab's cached results.
  useEffect(() => {
    if (
      isFocused &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isMatchesPlaceholderData
    ) {
      void fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFocused,
    isMatchesPlaceholderData,
  ]);

  const filteredMatches = useMemo(
    () =>
      filterMatchesForBrowse(
        matches,
        statusFilter,
        oddsTierFilter,
        debouncedSearchQuery,
        kickoffGuardNow,
      ),
    [
      debouncedSearchQuery,
      kickoffGuardNow,
      matches,
      oddsTierFilter,
      statusFilter,
    ],
  );

  // Upcoming and completed both only surface matches the model actually made a
  // confident call on (across 1X2, BTTS and Over/Under 2.5), so the Completed
  // tab mirrors Upcoming instead of showing every finished fixture's raw 1X2.
  const showsConfidentPicksOnly =
    statusFilter === 'upcoming' || statusFilter === 'completed';

  const confidentBrowse = useMemo(
    () => filterHighConfidenceMatchesWithPicks(filteredMatches),
    [filteredMatches],
  );

  const visibleMatches = useMemo(
    () => (showsConfidentPicksOnly ? confidentBrowse.matches : filteredMatches),
    [confidentBrowse.matches, filteredMatches, showsConfidentPicksOnly],
  );

  const qualifyingPicksByMatchId = useMemo(
    () =>
      showsConfidentPicksOnly ? confidentBrowse.picksByMatchId : undefined,
    [confidentBrowse.picksByMatchId, showsConfidentPicksOnly],
  );

  const gridRows = useMemo(
    () => chunkMatchesGridRows(visibleMatches),
    [visibleMatches],
  );

  const emptyMessage = useMemo(
    () =>
      getMatchesEmptyMessage(statusFilter, oddsTierFilter, debouncedSearchQuery, true),
    [debouncedSearchQuery, oddsTierFilter, statusFilter],
  );

  const onRefresh = useCallback(() => {
    void refetchMatches();
  }, [refetchMatches]);

  // Switching filters/tabs changes the query key, so react-query serves the
  // previous tab's rows as placeholder data while the real fetch runs. Those
  // rows filter down to nothing under the new filter, which briefly renders a
  // misleading "No confident picks" empty state. Treat an in-flight placeholder
  // fetch that currently has nothing to show as loading instead.
  const isMatchesLoading =
    isInitialQueryLoad(isMatchesQueryLoading, matchesData) ||
    (isMatchesPlaceholderData && visibleMatches.length === 0);

  if (queryErrorForDisplay(matchesError, matchesData)) {
    return (
      <ErrorState message="Could not load matches" onRetry={onRefresh} />
    );
  }

  return (
    <ScrollView
      style={screenStyles.screenContainer}
      contentContainerStyle={[
        screenStyles.scrollContent,
        { paddingBottom: scrollBottomPadding },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isMatchesRefetching && !isMatchesPlaceholderData}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.filters}>
        <SearchInput onChangeText={setSearchQuery} value={searchQuery} />
        <SegmentedControl
          onChange={setStatusFilter}
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'live', label: 'Live' },
            { value: 'completed', label: 'Completed' },
          ]}
          value={statusFilter}
        />
        <FilterChipRow
          onChange={setOddsTierFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          value={oddsTierFilter}
        />
      </View>

      <AsyncState
        isLoading={isMatchesLoading}
        error={null}
        isEmpty={visibleMatches.length === 0}
        emptyMessage={emptyMessage}
      >
        <View style={[styles.cardGrid, { gap: gridMetrics.gutter }]}>
          {gridRows.map((row, rowIndex) => (
            <View
              key={`matches-row-${rowIndex}`}
              style={[styles.cardRow, { gap: gridMetrics.gutter }]}
            >
              {row.map((match) => (
                <View
                  key={match.id}
                  style={[styles.cardGridItem, { width: gridMetrics.columnWidth }]}
                >
                  <MatchCardV2
                    compact
                    match={match}
                    odds={match.odds}
                    prediction={match.prediction}
                    qualifyingPicks={qualifyingPicksByMatchId?.get(match.id)}
                    slate={filteredMatches}
                    onDetailsPress={() => {
                      navigation.navigate('MatchDetail', { matchId: String(match.id) });
                    }}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </AsyncState>

      {isFetchingNextPage && visibleMatches.length > 0 ? (
        <View style={styles.footerLoading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: spacing.md,
  },
  cardGrid: {
    width: '100%',
  },
  cardRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    width: '100%',
  },
  cardGridItem: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
  },
  footerLoading: {
    paddingVertical: spacing.lg,
  },
});
