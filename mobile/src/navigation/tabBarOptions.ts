import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { colors, spacing, typography } from '../theme';

import { stackScreenOptions } from './stackScreenOptions';

export const TAB_BAR_BASE_HEIGHT = 56;

export function buildTabBarScreenOptions(bottomInset = 0): BottomTabNavigationOptions {
  const paddingBottom = Math.max(bottomInset, spacing.sm);

  return {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: colors.cardElevated,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: TAB_BAR_BASE_HEIGHT + paddingBottom,
      paddingBottom,
      paddingTop: spacing.xs,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarLabelStyle: typography.caption,
  };
}

export const tabBarScreenOptions = buildTabBarScreenOptions();

export function tabStackHeaderOptions(title: string): BottomTabNavigationOptions {
  return {
    headerShown: true,
    headerStyle: stackScreenOptions.headerStyle,
    headerTintColor: stackScreenOptions.headerTintColor,
    headerTitleStyle: stackScreenOptions.headerTitleStyle,
    headerTitle: title,
    headerShadowVisible: false,
  };
}
