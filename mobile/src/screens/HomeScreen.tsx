import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAnalytics, useMatches } from '../api/hooks';
import {
  AiPredictionsHero,
  AsyncState,
  DatePickerRow,
  EmptyState,
  ErrorState,
  LoadingState,
  MatchCardV2,
  SectionHeader,
} from '../components';
import type { OddsTier } from '../components/demo/demoUtils';
import { useMatchDateAnchor } from '../hooks/useMatchDateAnchor';
import { useNow } from '../hooks/useNow';
import type { HomeStackParamList } from '../navigation/types';
import { colors, screenStyles, spacing } from '../theme';
import { filterHighConfidenceMatches } from '../utils/marketPicks';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';
import { buildHeroStats } from './homeHeroUtils';
import {
  COMING_UP_MATCH_LIMIT,
  filterUpcomingMatchesForDay,
  groupHomeMatchesByOddsTier,
  selectComingUpMatches,
} from './homeMatchUtils';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const ODDS_TIER_META: Record<
  OddsTier,
  { title: string; icon: IoniconName; color: string }
> = {
  low: { title: 'Low Odds', icon: 'shield-checkmark-outline', color: colors.oddsLow },
  medium: { title: 'Medium Odds', icon: 'trending-up-outline', color: colors.oddsMedium },
  high: { title: 'High Odds', icon: 'flame-outline', color: colors.oddsHigh },
};

function formatMatchesAvailable(count: number): string {
  return `${count} ${count === 1 ? 'match' : 'matches'} available`;
}

export function HomeScreen({ navigation }: Props) {
  const {
    anchorDate,
    dateRange,
    matchListParams,
    selectedDate,
    setSelectedDate,
    dashboardQuery,
  } = useMatchDateAnchor();
  const matchesQuery = useMatches(matchListParams);
  const analyticsQuery = useAnalytics({ enabled: !!dashboardQuery.data });
  const now = useNow();
  // Default to the "Coming up" view rather than a single day.
  const [isWeekSelected, setIsWeekSelected] = useState(true);

  const selectDate = useCallback(
    (date: Date) => {
      setIsWeekSelected(false);
      setSelectedDate(date);
    },
    [setSelectedDate],
  );

  const selectWeek = useCallback(() => {
    setIsWeekSelected(true);
  }, []);

  const filteredMatches = useMemo(
    () =>
      isWeekSelected
        ? selectComingUpMatches(matchesQuery.data ?? [], now, anchorDate)
        : filterUpcomingMatchesForDay(matchesQuery.data ?? [], selectedDate, now),
    [isWeekSelected, matchesQuery.data, selectedDate, now, anchorDate],
  );

  // Selectivity: only surface the slate's most confident picks so the AI "picks
  // its spots" instead of predicting every match. "Coming up" spans a rolling
  // week, so cap it at the soonest N confident picks rather than the whole slate.
  const visibleMatches = useMemo(() => {
    const confident = filterHighConfidenceMatches(filteredMatches);
    return isWeekSelected ? confident.slice(0, COMING_UP_MATCH_LIMIT) : confident;
  }, [filteredMatches, isWeekSelected]);

  const oddsTierGroups = useMemo(
    () => groupHomeMatchesByOddsTier(visibleMatches),
    [visibleMatches],
  );

  const shownPredictionCount = useMemo(
    () => oddsTierGroups.reduce((total, group) => total + group.matches.length, 0),
    [oddsTierGroups],
  );

  const heroStats = useMemo(
    () =>
      dashboardQuery.data
        ? buildHeroStats(dashboardQuery.data, visibleMatches, shownPredictionCount)
        : null,
    [dashboardQuery.data, visibleMatches, shownPredictionCount],
  );

  const isInitialLoading = isInitialQueryLoad(
    dashboardQuery.isLoading,
    dashboardQuery.data,
  );

  const isRefreshing =
    dashboardQuery.isRefetching ||
    matchesQuery.isRefetching ||
    analyticsQuery.isRefetching;

  const onRefresh = useCallback(() => {
    void dashboardQuery.refetch();
    void matchesQuery.refetch();
    void analyticsQuery.refetch();
  }, [analyticsQuery, dashboardQuery, matchesQuery]);

  const onRetry = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const openMatchDetail = useCallback(
    (matchId: number) => {
      navigation.push('MatchDetail', { matchId: String(matchId) });
    },
    [navigation],
  );

  if (isInitialLoading) {
    return <LoadingState message="Loading dashboard…" />;
  }

  if (queryErrorForDisplay(dashboardQuery.error, dashboardQuery.data)) {
    return <ErrorState message="Could not load dashboard" onRetry={onRetry} />;
  }

  const dashboard = dashboardQuery.data;
  if (!dashboard || !heroStats) {
    return <EmptyState message="No dashboard data available" />;
  }

  return (
    <ScrollView
      style={screenStyles.screenContainer}
      contentContainerStyle={screenStyles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <DatePickerRow
        dates={dateRange}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        isWeekSelected={isWeekSelected}
        onSelectWeek={selectWeek}
      />

      <AiPredictionsHero stats={heroStats} />

      <View style={screenStyles.section}>
        <AsyncState
          isLoading={isInitialQueryLoad(matchesQuery.isLoading, matchesQuery.data)}
          error={queryErrorForDisplay(matchesQuery.error, matchesQuery.data)}
          isEmpty={oddsTierGroups.length === 0}
          emptyMessage={
            isWeekSelected
              ? 'No confident picks coming up'
              : 'No confident picks on this day'
          }
          errorMessage="Could not load matches"
          onRetry={() => void matchesQuery.refetch()}
        >
          <View style={styles.tierGroups}>
            {oddsTierGroups.map((group) => {
              const meta = ODDS_TIER_META[group.tier];
              return (
                <View key={group.tier} style={screenStyles.section}>
                  <SectionHeader
                    icon={meta.icon}
                    iconColor={meta.color}
                    subtitle={formatMatchesAvailable(group.matches.length)}
                    title={meta.title}
                  />
                  <View style={screenStyles.cardList}>
                    {group.matches.map((match) => (
                      <MatchCardV2
                        key={match.id}
                        match={match}
                        odds={match.odds}
                        prediction={match.prediction}
                        slate={filteredMatches}
                        onDetailsPress={() => openMatchDetail(match.id)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </AsyncState>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tierGroups: {
    gap: spacing.xl,
  },
});
