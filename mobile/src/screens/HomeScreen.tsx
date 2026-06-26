import { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
import { useMatchDateAnchor } from '../hooks/useMatchDateAnchor';
import type { HomeStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';
import { filterMatchesByDate } from '../utils/matchDates';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';
import { buildHeroStats } from './homeHeroUtils';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const {
    dateRange,
    matchListParams,
    selectedDate,
    setSelectedDate,
    dashboardQuery,
  } = useMatchDateAnchor();
  const matchesQuery = useMatches(matchListParams);
  const analyticsQuery = useAnalytics();

  const filteredMatches = useMemo(
    () => filterMatchesByDate(matchesQuery.data ?? [], selectedDate),
    [matchesQuery.data, selectedDate],
  );

  const heroStats = useMemo(
    () =>
      dashboardQuery.data
        ? buildHeroStats(
            dashboardQuery.data,
            analyticsQuery.data,
            matchesQuery.data ?? [],
          )
        : null,
    [analyticsQuery.data, dashboardQuery.data, matchesQuery.data],
  );

  const isInitialLoading =
    isInitialQueryLoad(dashboardQuery.isLoading, dashboardQuery.data) ||
    isInitialQueryLoad(matchesQuery.isLoading, matchesQuery.data);

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
      style={styles.container}
      contentContainerStyle={styles.content}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Matches</Text>
        <AsyncState
          isLoading={isInitialQueryLoad(matchesQuery.isLoading, matchesQuery.data)}
          error={queryErrorForDisplay(matchesQuery.error, matchesQuery.data)}
          isEmpty={filteredMatches.length === 0}
          emptyMessage="No matches on this day"
          errorMessage="Could not load matches"
          onRetry={() => void matchesQuery.refetch()}
        >
          <View style={styles.cardList}>
            {filteredMatches.map((match) => (
              <MatchCardV2
                key={match.id}
                match={match}
                odds={match.odds}
                prediction={match.prediction}
                onDetailsPress={() =>
                  navigation.navigate('MatchDetail', { matchId: String(match.id) })
                }
              />
            ))}
          </View>
        </AsyncState>
      </View>

      <View style={styles.section}>
        <SectionHeader
          subtitle="Highest edge picks kicking off today"
          title="Top Value Bets"
        />
        <AsyncState
          isLoading={false}
          error={null}
          isEmpty={(dashboard.top_value_bets ?? []).length === 0}
          emptyMessage="No value bets yet"
        >
          <View style={styles.cardList}>
            {(dashboard.top_value_bets ?? []).map((valueBet) => (
              <ValueBetCard
                key={valueBet.id}
                valueBet={valueBet}
                onPress={() =>
                  navigation.navigate('MatchDetail', {
                    matchId: String(valueBet.match_id),
                  })
                }
              />
            ))}
          </View>
        </AsyncState>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  cardList: {
    gap: spacing.md,
  },
});
