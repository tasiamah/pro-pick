import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { SectionHeader } from '../components';
import { colors, radii, screenStyles, spacing, typography } from '../theme';
import {
  ANALYTICS_DEMO_CONFIDENCE_TREND,
  ANALYTICS_DEMO_MODEL_PERFORMANCE,
  ANALYTICS_DEMO_PREDICTION_OUTCOMES,
  ANALYTICS_DEMO_RISK_DISTRIBUTION,
  ANALYTICS_DEMO_SUMMARY,
  type AnalyticsSummaryStat,
  type ModelPerformanceStat,
  type PredictionOutcomeStat,
} from './analyticsDemoData';
import { ConfidenceTrendChart } from './ConfidenceTrendChart';
import { RiskDistributionChart } from './RiskDistributionChart';

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

type ConfidenceTrendSectionProps = {
  chartWidth: number;
};

function ConfidenceTrendSection({ chartWidth }: ConfidenceTrendSectionProps) {
  return <ConfidenceTrendChart chartWidth={chartWidth} values={ANALYTICS_DEMO_CONFIDENCE_TREND} />;
}

type RiskDistributionSectionProps = {
  chartWidth: number;
};

function RiskDistributionSection({ chartWidth }: RiskDistributionSectionProps) {
  return (
    <RiskDistributionChart chartWidth={chartWidth} segments={ANALYTICS_DEMO_RISK_DISTRIBUTION} />
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

  return (
    <ScrollView
      style={screenStyles.screenContainer}
      contentContainerStyle={screenStyles.scrollContent}
    >
      <View style={styles.summaryGrid}>
        {ANALYTICS_DEMO_SUMMARY.map((stat) => (
          <SummaryStatCard key={stat.label} stat={stat} />
        ))}
      </View>

      <View style={screenStyles.section}>
        <SectionHeader title="Confidence Trend" />
        <ConfidenceTrendSection chartWidth={chartWidth} />
      </View>

      <View style={screenStyles.section}>
        <SectionHeader title="Risk Distribution" />
        <RiskDistributionSection chartWidth={chartWidth} />
      </View>

      <View style={screenStyles.section}>
        <SectionHeader title="Prediction Outcomes" />
        <ScrollView
          horizontal
          contentContainerStyle={styles.outcomesRow}
          showsHorizontalScrollIndicator={false}
        >
          {ANALYTICS_DEMO_PREDICTION_OUTCOMES.map((outcome) => (
            <OutcomeCard key={outcome.label} outcome={outcome} />
          ))}
        </ScrollView>
      </View>

      <View style={screenStyles.section}>
        <SectionHeader title="AI Model Performance" />
        <View style={styles.performanceCard}>
          {ANALYTICS_DEMO_MODEL_PERFORMANCE.map((stat) => (
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
