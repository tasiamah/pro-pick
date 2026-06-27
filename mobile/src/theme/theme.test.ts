import { colors, radii, screenStyles, spacing, typography } from '../theme';

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
    expect(typography.hero).toMatchObject({
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 34,
    });
    expect(typography.statValue).toMatchObject({
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 30,
    });
    expect(typography.badge).toMatchObject({
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 14,
      letterSpacing: 0.6,
    });
    expect(typography.sectionSubtitle).toMatchObject({
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    });
    expect(radii.md).toBe(12);
    expect(typography.micro).toMatchObject({
      fontSize: 10,
      lineHeight: 13,
    });
    expect(typography.metric).toMatchObject({
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 22,
    });
    expect(typography.labelStrong.fontWeight).toBe('600');
  });

  it('exports shared screen layout styles', () => {
    expect(screenStyles.scrollContent.gap).toBe(spacing.xl);
    expect(screenStyles.scrollContent.padding).toBe(spacing.lg);
    expect(screenStyles.stackContent.gap).toBe(spacing.md);
    expect(screenStyles.cardList.gap).toBe(spacing.md);
  });
});
