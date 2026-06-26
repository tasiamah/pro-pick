import { colors, typography } from '../theme';

import { screenTitles } from './screenTitles';
import { stackScreenOptions } from './stackScreenOptions';
import { tabBarScreenOptions } from './tabBarOptions';

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
    });
  });

  it('uses demo screen titles', () => {
    expect(screenTitles.home).toBe('Pro Pick');
    expect(screenTitles.matches).toBe('Match Predictions');
    expect(screenTitles.favorites).toBe('Favorites');
    expect(screenTitles.analytics).toBe('Pro Pick');
  });
});
