import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useCallback, useMemo } from 'react';
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
  ValueBetCard,
} from '../components';
import type { OddsTier } from '../components/demo/demoUtils';
import { useMatchDateAnchor } from '../hooks/useMatchDateAnchor';
import { useNow } from '../hooks/useNow';
import type { HomeStackParamList } from '../navigation/types';
import { colors, screenStyles, spacing } from '../theme';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';
import { buildHeroStats } from './homeHeroUtils';
import {
  filterUpcomingValueBets,
  groupHomeMatchesByOddsTier,
  selectHomeMatches,
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
    dateRange,
    matchListParams,
    selectedDate,
    setSelectedDate,
    dashboardQuery,
  } = useMatchDateAnchor();
  const matchesQuery = useMatches(matchListParams);
  const analyticsQuery = useAnalytics({ enabled: !!dashboardQuery.data });
  const now = useNow();

  const filteredMatches = useMemo(
    () => selectHomeMatches(matchesQuery.data ?? [], selectedDate, now),
    [matchesQuery.data, selectedDate, now],
  );

  const oddsTierGroups = useMemo(
    () => groupHomeMatchesByOddsTier(filteredMatches),
    [filteredMatches],
  );

  const visibleValueBets = useMemo(
    () =>
      matchesQuery.data
        ? filterUpcomingValueBets(
            dashboardQuery.data?.top_value_bets ?? [],
            matchesQuery.data,
            now,
          )
        : [],
    [dashboardQuery.data, matchesQuery.data, now],
  );

  const heroStats = useMemo(
    () =>
      dashboardQuery.data
        ? buildHeroStats(
            dashboardQuery.data,
            analyticsQuery.data,
            matchesQuery.data ?? [],
            now,
          )
        : null,
    [analyticsQuery.data, dashboardQuery.data, matchesQuery.data, now],
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
        onSelectDate={setSelectedDate}
      />

      <AiPredictionsHero stats={heroStats} />

      <View style={screenStyles.section}>
        <AsyncState
          isLoading={isInitialQueryLoad(matchesQuery.isLoading, matchesQuery.data)}
          error={queryErrorForDisplay(matchesQuery.error, matchesQuery.data)}
          isEmpty={oddsTierGroups.length === 0}
          emptyMessage="No matches on this day"
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

      <View style={screenStyles.section}>
        <SectionHeader
          subtitle="Highest edge picks kicking off today"
          title="Top Value Bets"
        />
        <AsyncState
          isLoading={isInitialQueryLoad(matchesQuery.isLoading, matchesQuery.data)}
          error={queryErrorForDisplay(matchesQuery.error, matchesQuery.data)}
          isEmpty={visibleValueBets.length === 0}
          emptyMessage="No value bets yet"
          errorMessage="Could not load value bets"
          onRetry={() => void matchesQuery.refetch()}
        >
          <View style={screenStyles.cardList}>
            {visibleValueBets.map((valueBet) => (
              <ValueBetCard
                key={valueBet.id}
                valueBet={valueBet}
                onPress={() => openMatchDetail(valueBet.match_id)}
              />
            ))}
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
