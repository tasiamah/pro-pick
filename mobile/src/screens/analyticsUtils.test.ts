import { formatTrendLabel, toRoiTrendChartData } from './analyticsUtils';

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
      { value: 10, label: 'Jun 1' },
      { value: -5, label: 'Jun 2' },
    ]);
    expect(toRoiTrendChartData(null)).toEqual([]);
  });
});
