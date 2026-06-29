import { buildRoiTrendRows, formatRoiValueLabel } from './roiTrendChartLayout';

describe('roiTrendChartLayout', () => {
  it('formats roi value labels with a sign', () => {
    expect(formatRoiValueLabel(12)).toBe('+12%');
    expect(formatRoiValueLabel(-5)).toBe('-5%');
    expect(formatRoiValueLabel(0)).toBe('0%');
  });

  it('scales bar widths relative to the largest magnitude', () => {
    const rows = buildRoiTrendRows([
      { value: 20, label: 'Jun 1' },
      { value: -10, label: 'Jun 2' },
      { value: 0, label: 'Jun 3' },
    ]);

    expect(rows).toEqual([
      { label: 'Jun 1', valueLabel: '+20%', widthPercent: 100, positive: true },
      { label: 'Jun 2', valueLabel: '-10%', widthPercent: 50, positive: false },
      { label: 'Jun 3', valueLabel: '0%', widthPercent: 0, positive: true },
    ]);
  });

  it('returns no rows for an empty series', () => {
    expect(buildRoiTrendRows([])).toEqual([]);
  });
});
