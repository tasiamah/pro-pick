import { colors, spacing, typography } from '../theme';

import { buildTabBarScreenOptions, TAB_BAR_BASE_HEIGHT, tabBarScreenOptions } from './tabBarOptions';
import { screenTitles } from './screenTitles';
import { stackScreenOptions } from './stackScreenOptions';

describe('navigation options', () => {
  it('exports demo stack header styling', () => {
    expect(stackScreenOptions.headerStyle).toEqual({ backgroundColor: colors.surface });
    expect(stackScreenOptions.headerTintColor).toBe(colors.text);
    expect(stackScreenOptions.headerTitleStyle).toBe(typography.title);
    expect(stackScreenOptions.headerShadowVisible).toBe(false);
    expect(stackScreenOptions.contentStyle).toEqual({ backgroundColor: colors.background });
  });

  it('exports demo tab bar styling', () => {
    expect(tabBarScreenOptions.tabBarActiveTintColor).toBe(colors.primary);
    expect(tabBarScreenOptions.tabBarInactiveTintColor).toBe(colors.textMuted);
    expect(tabBarScreenOptions.tabBarLabelStyle).toBe(typography.caption);
    expect(tabBarScreenOptions.tabBarStyle).toMatchObject({
      backgroundColor: colors.cardElevated,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingBottom: spacing.sm,
      paddingTop: spacing.xs,
      height: TAB_BAR_BASE_HEIGHT + spacing.sm,
    });
  });

  it('adds safe-area padding to the tab bar height', () => {
    expect(buildTabBarScreenOptions(34).tabBarStyle).toMatchObject({
      paddingBottom: 34,
      height: TAB_BAR_BASE_HEIGHT + 34,
    });
  });

  it('uses demo screen titles', () => {
    expect(screenTitles.home).toBe('ProPick');
    expect(screenTitles.matches).toBe('Match Predictions');
    expect(screenTitles.favorites).toBe('Favorites');
    expect(screenTitles.analytics).toBe('Analytics Dashboard');
  });
});
