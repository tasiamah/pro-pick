import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { Analytics, RoiTrendPoint } from '../api/types';
import { colors } from '../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type LineChartPoint = {
  key: string;
  value: number;
  label: string;
};

export type RiskDistributionSegment = {
  label: string;
  value: number;
  color: string;
};

export type PredictionOutcomeStat = {
  label: string;
  value: number;
};

export type AnalyticsSummaryStat = {
  label: string;
  value: string;
  icon: IoniconName;
  iconColor: string;
};

export type ModelPerformanceStat = {
  label: string;
  value: string;
  caption: string;
  valueColor: string;
};

export function formatTrendLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function toConfidenceTrendValues(
  values: number[] | null | undefined,
): number[] {
  if (!values?.length) {
    return [];
  }

  return values.filter((value) => Number.isFinite(value));
}

export function toRiskDistributionSegments(
  distribution: Analytics['risk_distribution'] | null | undefined,
): RiskDistributionSegment[] {
  const low = distribution?.low ?? 0;
  const medium = distribution?.medium ?? 0;
  const high = distribution?.high ?? 0;

  return [
    { label: 'Low Risk', value: low, color: colors.oddsLow },
    { label: 'Medium Risk', value: medium, color: colors.oddsMedium },
    { label: 'High Risk', value: high, color: colors.oddsHigh },
  ];
}

export function riskDistributionTotal(segments: RiskDistributionSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.value, 0);
}

export function toPredictionOutcomeStats(
  outcomes: Analytics['prediction_outcomes'] | null | undefined,
): PredictionOutcomeStat[] {
  return [
    { label: 'HOME WIN', value: outcomes?.home_win ?? 0 },
    { label: 'DRAW', value: outcomes?.draw ?? 0 },
    { label: 'BOTH TEAMS SCORE', value: outcomes?.both_teams_score ?? 0 },
    { label: 'OVER 2.5', value: outcomes?.over_25 ?? 0 },
    { label: 'AWAY WIN', value: outcomes?.away_win ?? 0 },
  ];
}

export function toAnalyticsSummaryStats(
  analytics: Analytics,
): AnalyticsSummaryStat[] {
  return [
    {
      label: 'Total Predictions',
      value: formatCountMetric(analytics.total_predictions ?? 0),
      icon: 'locate-outline',
      iconColor: colors.primary,
    },
    {
      label: 'Avg Confidence',
      value: formatAvgConfidenceMetric(analytics.avg_confidence),
      icon: 'pulse-outline',
      iconColor: colors.marketBlue,
    },
    {
      label: 'High Confidence',
      value: formatCountMetric(analytics.high_confidence_count ?? 0),
      icon: 'ribbon-outline',
      iconColor: colors.chartAway,
    },
    {
      label: 'Model Accuracy',
      value: formatAccuracyMetric(analytics.accuracy),
      icon: 'trending-up-outline',
      iconColor: colors.oddsLow,
    },
  ];
}

export function toModelPerformanceStats(
  analytics: Analytics,
): ModelPerformanceStat[] {
  return [
    {
      label: 'Overall Accuracy',
      value: formatAccuracyMetric(analytics.accuracy),
      caption: analytics.confident_coverage != null
        ? `${formatCoverageMetric(analytics.confident_coverage)} high-confidence picks`
        : 'Across settled predictions',
      valueColor: colors.primary,
    },
    {
      label: 'Predictions Today',
      value: formatCountMetric(analytics.predictions_today ?? 0),
      caption: 'Active matches',
      valueColor: colors.marketBlue,
    },
    {
      label: 'Markets Covered',
      value: formatCountMetric(analytics.markets_covered ?? 3),
      caption: 'Bet types available',
      valueColor: colors.chartAway,
    },
  ];
}

export function toRoiTrendChartData(
  points: RoiTrendPoint[] | null | undefined,
): LineChartPoint[] {
  if (!points?.length) {
    return [];
  }

  return points.map((point) => ({
    key: point.date,
    value: Math.round(point.roi * 100),
    label: formatTrendLabel(point.date),
  }));
}

export function formatAccuracyMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function formatAvgConfidenceMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function formatCoverageMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function formatRoiMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  const percent = value * 100;
  const prefix = percent > 0 ? '+' : '';
  return `${prefix}${percent.toFixed(1)}%`;
}

export function formatLogLossMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return value.toFixed(3);
}

export function formatCountMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '0';
  }

  return String(value);
}
