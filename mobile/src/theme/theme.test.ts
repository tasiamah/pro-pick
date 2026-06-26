import { colors, radii, spacing, typography } from '../theme';

describe('theme', () => {
  it('exports demo semantic colors', () => {
    expect(colors.win).toBe('#22c55e');
    expect(colors.loss).toBe('#ef4444');
    expect(colors.draw).toBe('#6b7280');
    expect(colors.oddsLow).toBe('#00ff88');
    expect(colors.oddsMedium).toBe('#eab308');
    expect(colors.oddsHigh).toBe('#f97316');
    expect(colors.surfaceElevated).toBe('#1a2332');
    expect(colors.primaryGlow).toBe('rgba(0, 255, 136, 0.35)');
    expect(colors.alertWarning).toBe('#f59e0b');
    expect(colors.chartHome).toBe('#00ff88');
    expect(colors.chartDraw).toBe('#6b7280');
    expect(colors.chartAway).toBe('#3b82f6');
    expect(colors.marketBlue).toBe('#60a5fa');
  });

  it('exports spacing and typography scales', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.xxl).toBe(32);
    expect(typography.title.fontSize).toBe(20);
    expect(typography.hero.fontSize).toBe(28);
    expect(typography.statValue.fontSize).toBe(24);
    expect(typography.badge.fontSize).toBe(11);
    expect(typography.sectionSubtitle.fontSize).toBe(14);
    expect(radii.md).toBe(12);
  });
});
