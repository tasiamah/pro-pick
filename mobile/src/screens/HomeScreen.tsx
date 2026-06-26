import { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMatches } from '../api/hooks';
import type { Dashboard } from '../api/types';
import {
  AsyncState,
  DatePickerRow,
  EmptyState,
  ErrorState,
  LoadingState,
  MatchCard,
  ValueBetCard,
} from '../components';
import { formatPercent } from '../components/formatters';
import { useMatchDateAnchor } from '../hooks/useMatchDateAnchor';
import type { HomeStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import {
  filterMatchesByDate,
} from '../utils/matchDates';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

function formatNullablePercent(value: number | null): string {
  return value == null ? '—' : formatPercent(value);
}

type StatItemProps = {
  label: string;
  value: string;
};

function StatItem({ label, value }: StatItemProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

type StatsRowProps = {
  dashboard: Dashboard;
};

function StatsRow({ dashboard }: StatsRowProps) {
  return (
    <View style={styles.statsGrid}>
      <StatItem label="Matches today" value={String(dashboard.matches_today)} />
      <StatItem label="Upcoming" value={String(dashboard.upcoming_matches)} />
      <StatItem
        label="Model accuracy"
        value={formatNullablePercent(dashboard.model_accuracy)}
      />
      <StatItem label="ROI" value={formatNullablePercent(dashboard.roi)} />
    </View>
  );
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

  const filteredMatches = useMemo(
    () => filterMatchesByDate(matchesQuery.data ?? [], selectedDate),
    [matchesQuery.data, selectedDate],
  );

  const isInitialLoading =
    isInitialQueryLoad(dashboardQuery.isLoading, dashboardQuery.data) ||
    isInitialQueryLoad(matchesQuery.isLoading, matchesQuery.data);

  const isRefreshing = dashboardQuery.isRefetching || matchesQuery.isRefetching;

  const onRefresh = useCallback(() => {
    void dashboardQuery.refetch();
    void matchesQuery.refetch();
  }, [dashboardQuery, matchesQuery]);

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
  if (!dashboard) {
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

      <StatsRow dashboard={dashboard} />

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
              <MatchCard
                key={match.id}
                match={match}
                prediction={match.prediction}
                odds={match.odds}
                onPress={() =>
                  navigation.navigate('MatchDetail', { matchId: String(match.id) })
                }
              />
            ))}
          </View>
        </AsyncState>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top value bets</Text>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.lg,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.title,
    color: colors.primary,
  },
  cardList: {
    gap: spacing.md,
  },
});
