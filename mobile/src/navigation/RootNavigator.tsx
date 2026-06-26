import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { colors } from '../theme';
import { FavoritesStackNavigator } from './FavoritesStackNavigator';
import { HomeStackNavigator } from './HomeStackNavigator';
import { MatchesStackNavigator } from './MatchesStackNavigator';
import { screenTitles } from './screenTitles';
import { tabBarScreenOptions, tabStackHeaderOptions } from './tabBarOptions';
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
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions}>
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
        component={MatchesStackNavigator}
        options={{
          title: 'Matches',
          tabBarIcon: ({ focused }) => <TabBarIcon name="pulse-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          title: 'Favorites',
          tabBarIcon: ({ focused }) => <TabBarIcon name="star-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          ...tabStackHeaderOptions(screenTitles.analytics),
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
    gap: 4,
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
    borderRadius: 3,
    height: 4,
    width: 4,
  },
});
