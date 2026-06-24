import { colors, radii, spacing, typography } from '../theme';

describe('theme', () => {
  it('exports demo semantic colors', () => {
    expect(colors.win).toBe('#22c55e');
    expect(colors.loss).toBe('#ef4444');
    expect(colors.draw).toBe('#6b7280');
    expect(colors.oddsLow).toBe('#00ff88');
    expect(colors.oddsMedium).toBe('#eab308');
    expect(colors.oddsHigh).toBe('#f97316');
  });

  it('exports spacing and typography scales', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.xxl).toBe(32);
    expect(typography.title.fontSize).toBe(20);
    expect(radii.md).toBe(12);
  });
});
