import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type AnalyticsSummaryStat = {
  label: string;
  value: string;
  icon: IoniconName;
  iconColor: string;
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

export type ModelPerformanceStat = {
  label: string;
  value: string;
  caption: string;
  valueColor: string;
};

export const ANALYTICS_DEMO_SUMMARY: AnalyticsSummaryStat[] = [
  {
    label: 'Total Predictions',
    value: '22',
    icon: 'locate-outline',
    iconColor: colors.primary,
  },
  {
    label: 'Avg Confidence',
    value: '74.3%',
    icon: 'pulse-outline',
    iconColor: colors.marketBlue,
  },
  {
    label: 'High Confidence',
    value: '11',
    icon: 'ribbon-outline',
    iconColor: colors.chartAway,
  },
  {
    label: 'Model Accuracy',
    value: '87.3%',
    icon: 'trending-up-outline',
    iconColor: colors.oddsLow,
  },
];

export const ANALYTICS_DEMO_CONFIDENCE_TREND = [
  42, 48, 51, 55, 58, 62, 60, 65, 68, 70, 72, 74, 73, 76, 78, 80, 79, 82, 84, 86,
];

export const ANALYTICS_DEMO_RISK_DISTRIBUTION: RiskDistributionSegment[] = [
  { label: 'Low Risk', value: 7, color: colors.oddsLow },
  { label: 'Medium Risk', value: 14, color: colors.oddsMedium },
  { label: 'High Risk', value: 1, color: colors.oddsHigh },
];

export const ANALYTICS_DEMO_PREDICTION_OUTCOMES: PredictionOutcomeStat[] = [
  { label: 'HOME WIN', value: 10 },
  { label: 'DRAW', value: 2 },
  { label: 'BOTH TEAMS SCORE', value: 3 },
  { label: 'OVER 2.5', value: 4 },
  { label: 'AWAY WIN', value: 3 },
];

export const ANALYTICS_DEMO_MODEL_PERFORMANCE: ModelPerformanceStat[] = [
  {
    label: 'Overall Accuracy',
    value: '87.3%',
    caption: '↑ 2.1% vs last month',
    valueColor: colors.primary,
  },
  {
    label: 'Predictions Today',
    value: '0',
    caption: 'Active matches',
    valueColor: colors.marketBlue,
  },
  {
    label: 'Markets Covered',
    value: '6',
    caption: 'Bet types available',
    valueColor: colors.chartAway,
  },
];
