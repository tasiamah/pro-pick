import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';
import { HomeStackNavigator } from './HomeStackNavigator';
import { StackHeaderTitle } from './StackHeaderTitle';
import { buildTabBarScreenOptions } from './tabBarOptions';
import { screenTitles } from './screenTitles';
import { stackScreenOptions } from './stackScreenOptions';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

type TabIconName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICON_SIZE = 22;

type TabBarIconProps = {
  name: TabIconName;
  focused: boolean;
};

function TabBarIcon({ name, focused }: TabBarIconProps) {
  return (
    <View style={[styles.tabIconContainer, focused ? styles.tabIconGlow : null]}>
      <Ionicons
        name={name}
        size={TAB_ICON_SIZE}
        color={focused ? colors.primary : colors.textMuted}
      />
      {focused ? <View style={styles.tabActiveDot} /> : null}
    </View>
  );
}

export function RootNavigator() {
  const insets = useSafeAreaInsets();
  const screenOptions = useMemo(
    () => ({
      ...buildTabBarScreenOptions(insets.bottom),
      lazy: true,
      freezeOnBlur: true,
    }),
    [insets.bottom],
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon name="grid-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MatchesTab"
        getComponent={() => require('./MatchesStackNavigator').MatchesStackNavigator}
        options={{
          title: 'Matches',
          tabBarIcon: ({ focused }) => <TabBarIcon name="pulse-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        getComponent={() => require('./FavoritesStackNavigator').FavoritesStackNavigator}
        options={{
          title: 'Favorites',
          tabBarIcon: ({ focused }) => <TabBarIcon name="star-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        getComponent={() => require('../screens/AnalyticsScreen').AnalyticsScreen}
        options={{
          title: 'Analytics',
          headerShown: true,
          headerStyle: stackScreenOptions.headerStyle,
          headerTintColor: stackScreenOptions.headerTintColor,
          headerShadowVisible: false,
          headerTitle: () => (
            <StackHeaderTitle title={screenTitles.analytics} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="bar-chart-outline" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  tabIconGlow: {
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  tabActiveDot: {
    backgroundColor: colors.primary,
    borderRadius: spacing.xs / 2,
    height: spacing.xs,
    width: spacing.xs,
  },
});
