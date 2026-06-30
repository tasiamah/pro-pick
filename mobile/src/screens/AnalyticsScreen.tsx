import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

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
import { ConfidenceTrendChart } from './ConfidenceTrendChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import {
  type AnalyticsSummaryStat,
  type ModelPerformanceStat,
  type PredictionOutcomeStat,
  riskDistributionTotal,
  toAnalyticsSummaryStats,
  toConfidenceTrendValues,
  toModelPerformanceStats,
  toPredictionOutcomeStats,
  toRiskDistributionSegments,
} from './analyticsUtils';

type SummaryStatCardProps = {
  stat: AnalyticsSummaryStat;
};

function SummaryStatCard({ stat }: SummaryStatCardProps) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
      <Text style={styles.summaryLabel}>{stat.label}</Text>
      <Text style={styles.summaryValue}>{stat.value}</Text>
    </View>
  );
}

type OutcomeCardProps = {
  outcome: PredictionOutcomeStat;
};

function OutcomeCard({ outcome }: OutcomeCardProps) {
  return (
    <View style={styles.outcomeCard}>
      <Text style={styles.outcomeValue}>{outcome.value}</Text>
      <Text style={styles.outcomeLabel}>{outcome.label}</Text>
    </View>
  );
}

type PerformanceColumnProps = {
  stat: ModelPerformanceStat;
};

function PerformanceColumn({ stat }: PerformanceColumnProps) {
  return (
    <View style={styles.performanceColumn}>
      <Text style={styles.performanceLabel}>{stat.label}</Text>
      <Text style={[styles.performanceValue, { color: stat.valueColor }]}>{stat.value}</Text>
      <Text style={styles.performanceCaption}>{stat.caption}</Text>
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
    return <ErrorState message="Could not load analytics" onRetry={onRefresh} />;
  }

  const analytics = analyticsQuery.data;
  if (!analytics) {
    return <EmptyState message="No analytics available" />;
  }

  const summaryStats = toAnalyticsSummaryStats(analytics);
  const confidenceTrend = toConfidenceTrendValues(analytics.confidence_trend ?? []);
  const riskSegments = toRiskDistributionSegments(analytics.risk_distribution);
  const predictionOutcomes = toPredictionOutcomeStats(analytics.prediction_outcomes);
  const modelPerformance = toModelPerformanceStats(analytics);
  const hasPredictionOutcomes = predictionOutcomes.some((outcome) => outcome.value > 0);

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
        <SectionHeader title="Confidence Trend" />
        <AsyncState
          isLoading={false}
          error={null}
          isEmpty={confidenceTrend.length === 0}
          emptyMessage="No prediction confidence data yet"
        >
          <ConfidenceTrendChart chartWidth={chartWidth} values={confidenceTrend} />
        </AsyncState>
      </View>

      <View style={screenStyles.section}>
        <SectionHeader title="Risk Distribution" />
        <AsyncState
          isLoading={false}
          error={null}
          isEmpty={riskDistributionTotal(riskSegments) === 0}
          emptyMessage="No value bets to classify yet"
        >
          <RiskDistributionChart chartWidth={chartWidth} segments={riskSegments} />
        </AsyncState>
      </View>

      <View style={screenStyles.section}>
        <SectionHeader title="Prediction Outcomes" />
        <AsyncState
          isLoading={false}
          error={null}
          isEmpty={!hasPredictionOutcomes}
          emptyMessage="No prediction outcomes yet"
        >
          <ScrollView
            horizontal
            contentContainerStyle={styles.outcomesRow}
            showsHorizontalScrollIndicator={false}
          >
            {predictionOutcomes.map((outcome) => (
              <OutcomeCard key={outcome.label} outcome={outcome} />
            ))}
          </ScrollView>
        </AsyncState>
      </View>

      <View style={screenStyles.section}>
        <SectionHeader title="AI Model Performance" />
        <View style={styles.performanceCard}>
          {modelPerformance.map((stat) => (
            <PerformanceColumn key={stat.label} stat={stat} />
          ))}
        </View>
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
  outcomesRow: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  outcomeCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  outcomeValue: {
    ...typography.titleLarge,
    color: colors.text,
  },
  outcomeLabel: {
    ...typography.badge,
    color: colors.textMuted,
    textAlign: 'center',
  },
  performanceCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  performanceColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  performanceLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  performanceValue: {
    ...typography.title,
    color: colors.text,
  },
  performanceCaption: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
