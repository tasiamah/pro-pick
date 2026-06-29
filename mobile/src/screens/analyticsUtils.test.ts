import {
  formatAccuracyMetric,
  formatCountMetric,
  formatLogLossMetric,
  formatRoiMetric,
  formatTrendLabel,
  toRoiTrendChartData,
} from './analyticsUtils';

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

  it('formats accuracy as a percentage with a fallback', () => {
    expect(formatAccuracyMetric(0.873)).toBe('87.3%');
    expect(formatAccuracyMetric(null)).toBe('—');
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

  it('formats counts with a fallback', () => {
    expect(formatCountMetric(22)).toBe('22');
    expect(formatCountMetric(undefined)).toBe('—');
  });
});
