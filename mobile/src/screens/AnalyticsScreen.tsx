import { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { useAnalytics } from '../api/hooks';
import type { Analytics } from '../api/types';
import { EmptyState, ErrorState, LoadingState } from '../components';
import { formatPercent } from '../components/formatters';
import { colors, radii, spacing, typography } from '../theme';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';

import { toRoiTrendChartData } from './analyticsUtils';

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
  analytics: Analytics;
};

function StatsRow({ analytics }: StatsRowProps) {
  return (
    <View style={styles.statsGrid}>
      <StatItem label="Accuracy" value={formatNullablePercent(analytics.accuracy)} />
      <StatItem label="ROI" value={formatNullablePercent(analytics.roi)} />
      <StatItem
        label="Value bets"
        value={String(analytics.total_value_bets)}
      />
      <StatItem
        label="Settled"
        value={String(analytics.settled_value_bets)}
      />
    </View>
  );
}

type RoiTrendChartProps = {
  analytics: Analytics;
  chartWidth: number;
};

function RoiTrendChart({ analytics, chartWidth }: RoiTrendChartProps) {
  const chartData = toRoiTrendChartData(analytics.roi_trend);

  if (chartData.length === 0) {
    return (
      <EmptyState message="No settled value bets yet to show ROI trends." />
    );
  }

  return (
    <View style={styles.chartCard}>
      <LineChart
        data={chartData}
        width={chartWidth}
        height={220}
        color={colors.primary}
        thickness={2}
        hideDataPoints={chartData.length > 12}
        dataPointsColor={colors.primary}
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        rulesColor={colors.border}
        yAxisTextStyle={styles.axisLabel}
        xAxisLabelTextStyle={styles.axisLabel}
        noOfSections={4}
        yAxisLabelSuffix="%"
        backgroundColor={colors.surface}
        curved
      />
    </View>
  );
}

export function AnalyticsScreen() {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - spacing.lg * 4, 240);
  const analyticsQuery = useAnalytics();

  const onRefresh = useCallback(() => {
    void analyticsQuery.refetch();
  }, [analyticsQuery]);

  if (isInitialQueryLoad(analyticsQuery.isLoading, analyticsQuery.data)) {
    return <LoadingState message="Loading analytics…" />;
  }

  if (queryErrorForDisplay(analyticsQuery.error, analyticsQuery.data)) {
    return (
      <ErrorState message="Could not load analytics" onRetry={onRefresh} />
    );
  }

  const analytics = analyticsQuery.data;
  if (!analytics) {
    return <EmptyState message="No analytics data available" />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={analyticsQuery.isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <StatsRow analytics={analytics} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ROI trend</Text>
        <RoiTrendChart analytics={analytics} chartWidth={chartWidth} />
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
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: spacing.lg,
  },
  axisLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
