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

import { useMatches, useMatchesInfinite } from '../api/hooks';
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
import { isInitialQueryLoad, isMatchesBrowseLoading, queryErrorForDisplay } from '../utils/queryState';
import {
  chunkMatchesGridRows,
  getMatchesGridMetrics,
  getMatchesScrollBottomPadding,
} from './matchesGridLayout';
import {
  filterMatchesForBrowse,
  getMatchesEmptyMessage,
  getNoConfidentPicksEmptyState,
  type MatchOddsTierFilter,
  type MatchStatusFilter,
} from './matchesFilterUtils';

type Props = NativeStackScreenProps<MatchesStackParamList, 'Matches'>;

const SEARCH_DEBOUNCE_MS = 300;
const UPCOMING_BROWSE_WINDOW_DAYS = 14;
/** Completed tab loads further back so recent tournament results stay visible. */
const COMPLETED_BROWSE_WINDOW_DAYS = 90;
const MATCHES_PAGE_LIMIT = 50;
/** Completed tab: 90-day window, up to 200 fixtures (API max), confidence-filtered in UI. */
const COMPLETED_MATCHES_LIMIT = 200;
const COMPLETED_MATCHES_STALE_MS = 120_000;
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
  const isCompletedTab = statusFilter === 'completed';

  const completedListParams = useMemo(() => {
    const today = localDayKeyToDate(localDayKey);
    const start = addLocalDays(today, -COMPLETED_BROWSE_WINDOW_DAYS);
    const end = addLocalDays(today, 1);

    const params: MatchListParams = {
      kickoff_from: start.toISOString(),
      kickoff_to: end.toISOString(),
      limit: COMPLETED_MATCHES_LIMIT,
      status: 'completed',
    };

    const trimmedQuery = debouncedSearchQuery.trim();
    if (trimmedQuery) {
      params.q = trimmedQuery;
    }
    if (oddsTierFilter !== 'all') {
      params.odds_tier = oddsTierFilter;
    }

    return params;
  }, [debouncedSearchQuery, localDayKey, oddsTierFilter]);

  const pagedListParams = useMemo(() => {
    const today = localDayKeyToDate(localDayKey);
    const start = addLocalDays(today, -UPCOMING_BROWSE_WINDOW_DAYS);
    const end = addLocalDays(today, UPCOMING_BROWSE_WINDOW_DAYS);

    const params: MatchListParams = {
      kickoff_from: start.toISOString(),
      kickoff_to: end.toISOString(),
      limit: MATCHES_PAGE_LIMIT,
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

  // Prefetch completed while Upcoming/Live is visible so the tab opens instantly.
  const completedMatchesQuery = useMatches(completedListParams, {
    enabled: isFocused,
    keepPreviousData: true,
    staleTime: COMPLETED_MATCHES_STALE_MS,
  });

  const pagedMatchesQuery = useMatchesInfinite(pagedListParams, {
    enabled: isFocused && !isCompletedTab,
    keepPreviousData: true,
    refetchInterval:
      isFocused && statusFilter === 'live' ? LIVE_REFETCH_INTERVAL_MS : false,
  });

  const hasCompletedCachedResults =
    completedMatchesQuery.data != null && !completedMatchesQuery.isPlaceholderData;

  const hasNextPage = isCompletedTab ? false : pagedMatchesQuery.hasNextPage;
  const isFetchingNextPage = isCompletedTab
    ? false
    : pagedMatchesQuery.isFetchingNextPage;
  const isPagedPlaceholderData = pagedMatchesQuery.isPlaceholderData;
  const fetchNextPage = pagedMatchesQuery.fetchNextPage;

  const matches = useMemo(() => {
    if (isCompletedTab) {
      return completedMatchesQuery.data ?? [];
    }

    return pagedMatchesQuery.data?.pages.flat() ?? [];
  }, [completedMatchesQuery.data, isCompletedTab, pagedMatchesQuery.data]);

  // Upcoming/Live keep paging in the background; Completed loads in one batch.
  useEffect(() => {
    if (
      isCompletedTab ||
      !isFocused ||
      !hasNextPage ||
      isFetchingNextPage ||
      isPagedPlaceholderData
    ) {
      return;
    }

    void fetchNextPage();
  }, [
    fetchNextPage,
    hasNextPage,
    isCompletedTab,
    isFetchingNextPage,
    isFocused,
    isPagedPlaceholderData,
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

  const emptyState = useMemo(() => {
    const hasSearch = debouncedSearchQuery.trim().length > 0;
    const hasOddsTierFilter = oddsTierFilter !== 'all';

    if (hasSearch || hasOddsTierFilter || statusFilter === 'live') {
      return {
        message: getMatchesEmptyMessage(
          statusFilter,
          oddsTierFilter,
          debouncedSearchQuery,
          showsConfidentPicksOnly,
        ),
        subtext: undefined,
      };
    }

    if (showsConfidentPicksOnly) {
      const context =
        statusFilter === 'completed' ? 'matches_completed' : 'matches_upcoming';
      const confidentEmpty = getNoConfidentPicksEmptyState(filteredMatches, context);
      return {
        message: confidentEmpty.title,
        subtext: confidentEmpty.subtext,
      };
    }

    return {
      message: getMatchesEmptyMessage(statusFilter, oddsTierFilter, debouncedSearchQuery),
      subtext: undefined,
    };
  }, [
    debouncedSearchQuery,
    filteredMatches.length,
    oddsTierFilter,
    showsConfidentPicksOnly,
    statusFilter,
  ]);

  const onRefresh = useCallback(() => {
    if (isCompletedTab) {
      void completedMatchesQuery.refetch();
      return;
    }

    void pagedMatchesQuery.refetch();
  }, [completedMatchesQuery, isCompletedTab, pagedMatchesQuery]);

  const isMatchesLoading = isCompletedTab
    ? isMatchesBrowseLoading({
        isInitialLoad: isInitialQueryLoad(
          completedMatchesQuery.isLoading,
          completedMatchesQuery.data,
        ),
        isPlaceholderData: completedMatchesQuery.isPlaceholderData,
        isFetching: completedMatchesQuery.isFetching,
        isFetchingNextPage: false,
        hasNextPage: false,
        visibleMatchCount: visibleMatches.length,
        hasCachedResults: hasCompletedCachedResults,
      })
    : isMatchesBrowseLoading({
        isInitialLoad: isInitialQueryLoad(
          pagedMatchesQuery.isLoading,
          pagedMatchesQuery.data,
        ),
        isPlaceholderData: pagedMatchesQuery.isPlaceholderData,
        isFetching: pagedMatchesQuery.isFetching,
        isFetchingNextPage,
        hasNextPage,
        visibleMatchCount: visibleMatches.length,
      });

  const matchesData = isCompletedTab
    ? completedMatchesQuery.data
    : pagedMatchesQuery.data;
  const matchesError = isCompletedTab
    ? completedMatchesQuery.error
    : pagedMatchesQuery.error;

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
          refreshing={
            isCompletedTab
              ? completedMatchesQuery.isRefetching &&
                !completedMatchesQuery.isPlaceholderData
              : pagedMatchesQuery.isRefetching &&
                !pagedMatchesQuery.isPlaceholderData
          }
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
        emptyMessage={emptyState.message}
        emptySubtext={emptyState.subtext}
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

      {isFetchingNextPage && !isCompletedTab && visibleMatches.length > 0 ? (
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
