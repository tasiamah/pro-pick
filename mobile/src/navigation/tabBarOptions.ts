import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { colors, typography } from '../theme';

import { stackScreenOptions } from './stackScreenOptions';

export const tabBarScreenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: colors.cardElevated,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: typography.caption,
};

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
