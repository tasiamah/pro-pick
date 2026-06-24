import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useDashboard, useMatches } from '../api/hooks';
import type { Dashboard, Match } from '../api/types';
import {
  AsyncState,
  EmptyState,
  ErrorState,
  LoadingState,
  MatchCard,
  ValueBetCard,
} from '../components';
import { formatPercent } from '../components/formatters';
import type { HomeStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const DATE_RANGE_DAYS = 7;

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toUtcDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function formatDateChipLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function buildDateRange(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addUtcDays(start, index));
}

function filterMatchesByDate(matches: Match[], selectedDate: Date): Match[] {
  const selectedKey = toUtcDateKey(selectedDate);

  return matches
    .filter((match) => match.kickoff && toUtcDateKey(match.kickoff) === selectedKey)
    .sort((left, right) => {
      const leftTime = left.kickoff ? new Date(left.kickoff).getTime() : 0;
      const rightTime = right.kickoff ? new Date(right.kickoff).getTime() : 0;
      return leftTime - rightTime;
    });
}

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

type DatePickerRowProps = {
  dates: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

function DatePickerRow({ dates, selectedDate, onSelectDate }: DatePickerRowProps) {
  const selectedKey = toUtcDateKey(selectedDate);

  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.datePickerContent}
      showsHorizontalScrollIndicator={false}
    >
      {dates.map((date) => {
        const dateKey = toUtcDateKey(date);
        const isSelected = dateKey === selectedKey;

        return (
          <Pressable
            key={dateKey}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectDate(date)}
            style={[styles.dateChip, isSelected && styles.dateChipSelected]}
          >
            <Text style={[styles.dateChipText, isSelected && styles.dateChipTextSelected]}>
              {formatDateChipLabel(date)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function HomeScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState(() => startOfUtcDay());
  const dashboardQuery = useDashboard();
  const matchesQuery = useMatches({ limit: 100 });

  const dateRange = useMemo(() => buildDateRange(startOfUtcDay(), DATE_RANGE_DAYS), []);

  const filteredMatches = useMemo(
    () => filterMatchesByDate(matchesQuery.data ?? [], selectedDate),
    [matchesQuery.data, selectedDate],
  );

  const isInitialLoading =
    (dashboardQuery.isLoading && !dashboardQuery.data) ||
    (matchesQuery.isLoading && !matchesQuery.data);

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

  if (dashboardQuery.error && !dashboardQuery.data) {
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
          isLoading={matchesQuery.isLoading && !matchesQuery.data}
          error={matchesQuery.error}
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
          isEmpty={dashboard.top_value_bets.length === 0}
          emptyMessage="No value bets yet"
        >
          <View style={styles.cardList}>
            {dashboard.top_value_bets.map((valueBet) => (
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
  datePickerContent: {
    gap: spacing.sm,
  },
  dateChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateChipSelected: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
  },
  dateChipText: {
    ...typography.label,
    color: colors.textMuted,
  },
  dateChipTextSelected: {
    color: colors.primary,
  },
  cardList: {
    gap: spacing.md,
  },
});
