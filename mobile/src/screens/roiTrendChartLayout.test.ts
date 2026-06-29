import { buildRoiTrendRows, formatRoiValueLabel } from './roiTrendChartLayout';

describe('roiTrendChartLayout', () => {
  it('formats roi value labels with a sign', () => {
    expect(formatRoiValueLabel(12)).toBe('+12%');
    expect(formatRoiValueLabel(-5)).toBe('-5%');
    expect(formatRoiValueLabel(0)).toBe('0%');
  });

  it('scales bar widths relative to the largest magnitude', () => {
    const rows = buildRoiTrendRows([
      { key: '2026-06-01', value: 20, label: 'Jun 1' },
      { key: '2026-06-02', value: -10, label: 'Jun 2' },
      { key: '2026-06-03', value: 0, label: 'Jun 3' },
    ]);

    expect(rows).toEqual([
      { key: '2026-06-01', label: 'Jun 1', valueLabel: '+20%', widthPercent: 100, positive: true },
      { key: '2026-06-02', label: 'Jun 2', valueLabel: '-10%', widthPercent: 50, positive: false },
      { key: '2026-06-03', label: 'Jun 3', valueLabel: '0%', widthPercent: 0, positive: true },
    ]);
  });

  it('returns no rows for an empty series', () => {
    expect(buildRoiTrendRows([])).toEqual([]);
  });
});
