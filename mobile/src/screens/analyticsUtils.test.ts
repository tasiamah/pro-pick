import type { Analytics } from '../api/types';
import {
  formatAccuracyMetric,
  formatAvgConfidenceMetric,
  formatCountMetric,
  formatLogLossMetric,
  formatRoiMetric,
  formatTrendLabel,
  riskDistributionTotal,
  toAnalyticsSummaryStats,
  toConfidenceTrendValues,
  toModelPerformanceStats,
  toPredictionOutcomeStats,
  toRiskDistributionSegments,
  toRoiTrendChartData,
} from './analyticsUtils';

const sampleAnalytics: Analytics = {
  accuracy: 0.513,
  confident_accuracy: 0.701,
  confident_coverage: 0.19,
  log_loss: 0.912,
  roi: 0.124,
  total_value_bets: 24,
  settled_value_bets: 19,
  roi_trend: [{ date: '2026-06-01', roi: 0.1 }],
  total_predictions: 22,
  avg_confidence: 0.743,
  high_confidence_count: 11,
  confidence_trend: [42, 48, 51, 55, 58],
  risk_distribution: { low: 7, medium: 14, high: 1 },
  prediction_outcomes: {
    home_win: 10,
    draw: 2,
    away_win: 3,
  },
  predictions_today: 0,
};

describe('analyticsUtils', () => {
  it('formats trend labels', () => {
    expect(formatTrendLabel('2026-06-24')).toBe('Jun 24');
  });

  it('maps roi trend points to chart data', () => {
    expect(
      toRoiTrendChartData([
        { date: '2026-06-01', roi: 0.1 },
        { date: '2026-06-02', roi: -0.05 },
      ]),
    ).toEqual([
      { key: '2026-06-01', value: 10, label: 'Jun 1' },
      { key: '2026-06-02', value: -5, label: 'Jun 2' },
    ]);
    expect(toRoiTrendChartData(null)).toEqual([]);
  });

  it('filters invalid confidence trend values', () => {
    expect(toConfidenceTrendValues([42, Number.NaN, 58])).toEqual([42, 58]);
    expect(toConfidenceTrendValues([])).toEqual([]);
    expect(toConfidenceTrendValues(undefined)).toEqual([]);
  });

  it('maps risk distribution segments with zero fallbacks', () => {
    const segments = toRiskDistributionSegments(undefined);
    expect(segments).toHaveLength(3);
    expect(riskDistributionTotal(segments)).toBe(0);
    expect(riskDistributionTotal(toRiskDistributionSegments(sampleAnalytics.risk_distribution))).toBe(22);
  });

  it('maps the 1X2 prediction outcomes we model', () => {
    expect(toPredictionOutcomeStats(sampleAnalytics.prediction_outcomes).map((item) => item.label)).toEqual([
      'HOME WIN',
      'DRAW',
      'AWAY WIN',
    ]);
  });

  it('builds summary and performance stats from analytics', () => {
    expect(toAnalyticsSummaryStats(sampleAnalytics).map((stat) => stat.label)).toEqual([
      'Total Predictions',
      'Avg Confidence',
      'High Confidence',
      'Model Accuracy',
    ]);
    expect(toModelPerformanceStats(sampleAnalytics).map((stat) => stat.label)).toEqual([
      'Accuracy',
      'Predictions Today',
      'Log Loss',
    ]);
    const logLoss = toModelPerformanceStats(sampleAnalytics).find(
      (stat) => stat.label === 'Log Loss',
    );
    expect(logLoss?.value).toBe('0.912');
  });

  it('surfaces high-confidence accuracy and never the full-slate figure', () => {
    const summary = toAnalyticsSummaryStats(sampleAnalytics);
    const accuracyCard = summary.find((stat) => stat.label === 'Model Accuracy');
    expect(accuracyCard?.value).toBe('70.1%');

    const performance = toModelPerformanceStats(sampleAnalytics);
    const accuracyColumn = performance.find((stat) => stat.label === 'Accuracy');
    expect(accuracyColumn?.value).toBe('70.1%');
    expect(accuracyColumn?.caption).toBe('With high confidence');

    const allValues = [
      ...summary.map((stat) => stat.value),
      ...performance.flatMap((stat) => [stat.value, stat.caption]),
    ];
    expect(allValues).not.toContain('51.3%');
  });

  it('formats accuracy as a percentage with a fallback', () => {
    expect(formatAccuracyMetric(0.873)).toBe('87.3%');
    expect(formatAccuracyMetric(null)).toBe('—');
  });

  it('formats average confidence as a percentage with a fallback', () => {
    expect(formatAvgConfidenceMetric(0.743)).toBe('74.3%');
    expect(formatAvgConfidenceMetric(null)).toBe('—');
  });

  it('formats roi as a signed percentage with a fallback', () => {
    expect(formatRoiMetric(0.124)).toBe('+12.4%');
    expect(formatRoiMetric(-0.08)).toBe('-8.0%');
    expect(formatRoiMetric(null)).toBe('—');
  });

  it('formats log loss to three decimals with a fallback', () => {
    expect(formatLogLossMetric(0.9123)).toBe('0.912');
    expect(formatLogLossMetric(null)).toBe('—');
  });

  it('formats counts with zero fallback', () => {
    expect(formatCountMetric(22)).toBe('22');
    expect(formatCountMetric(undefined)).toBe('0');
  });
});
