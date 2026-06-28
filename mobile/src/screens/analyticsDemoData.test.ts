import {
  ANALYTICS_DEMO_CONFIDENCE_TREND,
  ANALYTICS_DEMO_PREDICTION_OUTCOMES,
  ANALYTICS_DEMO_RISK_DISTRIBUTION,
  ANALYTICS_DEMO_SUMMARY,
} from './analyticsDemoData';
import { toConfidenceTrendChartData, toRiskDistributionChartData } from './analyticsUtils';

describe('analyticsDemoData', () => {
  it('exports demo summary stats', () => {
    expect(ANALYTICS_DEMO_SUMMARY).toHaveLength(4);
    expect(ANALYTICS_DEMO_SUMMARY[0]?.label).toBe('Total Predictions');
  });

  it('exports demo prediction outcomes', () => {
    expect(ANALYTICS_DEMO_PREDICTION_OUTCOMES).toHaveLength(5);
    expect(ANALYTICS_DEMO_PREDICTION_OUTCOMES[0]).toEqual({
      label: 'HOME WIN',
      value: 10,
    });
  });
});

describe('analytics demo chart mappers', () => {
  it('maps confidence trend values to chart points', () => {
    expect(toConfidenceTrendChartData(ANALYTICS_DEMO_CONFIDENCE_TREND.slice(0, 2))).toEqual([
      { value: 42, label: '1' },
      { value: 48, label: '2' },
    ]);
  });

  it('maps risk distribution segments to pie chart data', () => {
    expect(toRiskDistributionChartData(ANALYTICS_DEMO_RISK_DISTRIBUTION)).toEqual([
      { value: 7, color: ANALYTICS_DEMO_RISK_DISTRIBUTION[0]?.color },
      { value: 14, color: ANALYTICS_DEMO_RISK_DISTRIBUTION[1]?.color },
      { value: 1, color: ANALYTICS_DEMO_RISK_DISTRIBUTION[2]?.color },
    ]);
  });
});
