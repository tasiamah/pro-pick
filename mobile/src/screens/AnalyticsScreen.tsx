import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAnalytics } from '../api/hooks';
import {
  AsyncState,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
} from '../components';
import { colors, radii, screenStyles, spacing, typography } from '../theme';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';
import {
  formatAccuracyMetric,
  formatCountMetric,
  formatLogLossMetric,
  formatRoiMetric,
  toRoiTrendChartData,
} from './analyticsUtils';
import { RoiTrendChart } from './RoiTrendChart';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type SummaryStat = {
  label: string;
  value: string;
  icon: IoniconName;
  iconColor: string;
};

function SummaryStatCard({ stat }: { stat: SummaryStat }) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
      <Text style={styles.summaryLabel}>{stat.label}</Text>
      <Text style={styles.summaryValue}>{stat.value}</Text>
    </View>
  );
}

export function AnalyticsScreen() {
  const analyticsQuery = useAnalytics();

  const onRefresh = useCallback(() => {
    void analyticsQuery.refetch();
  }, [analyticsQuery]);

  if (isInitialQueryLoad(analyticsQuery.isLoading, analyticsQuery.data)) {
    return <LoadingState message="Loading analytics…" />;
  }

  if (queryErrorForDisplay(analyticsQuery.error, analyticsQuery.data)) {
    return <ErrorState message="Could not load analytics" onRetry={onRefresh} />;
  }

  const analytics = analyticsQuery.data;
  if (!analytics) {
    return <EmptyState message="No analytics available" />;
  }

  const summaryStats: SummaryStat[] = [
    {
      label: 'Model Accuracy',
      value: formatAccuracyMetric(analytics.accuracy),
      icon: 'trending-up-outline',
      iconColor: colors.oddsLow,
    },
    {
      label: 'ROI',
      value: formatRoiMetric(analytics.roi),
      icon: 'cash-outline',
      iconColor: colors.primary,
    },
    {
      label: 'Log Loss',
      value: formatLogLossMetric(analytics.log_loss),
      icon: 'pulse-outline',
      iconColor: colors.marketBlue,
    },
    {
      label: 'Value Bets',
      value: formatCountMetric(analytics.total_value_bets),
      icon: 'ribbon-outline',
      iconColor: colors.chartAway,
    },
  ];

  const roiTrend = toRoiTrendChartData(analytics.roi_trend);

  return (
    <ScrollView
      style={screenStyles.screenContainer}
      contentContainerStyle={screenStyles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={analyticsQuery.isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.summaryGrid}>
        {summaryStats.map((stat) => (
          <SummaryStatCard key={stat.label} stat={stat} />
        ))}
      </View>

      <View style={screenStyles.section}>
        <SectionHeader
          subtitle={`${analytics.settled_value_bets} of ${analytics.total_value_bets} value bets settled`}
          title="ROI Trend"
        />
        <AsyncState
          isLoading={false}
          error={null}
          isEmpty={roiTrend.length === 0}
          emptyMessage="No settled value bets yet"
        >
          <RoiTrendChart points={roiTrend} />
        </AsyncState>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryValue: {
    ...typography.statValue,
    color: colors.text,
  },
});
