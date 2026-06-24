import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';

import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { colors } from '../theme';
import { FavoritesStackNavigator } from './FavoritesStackNavigator';
import { HomeStackNavigator } from './HomeStackNavigator';
import { MatchesStackNavigator } from './MatchesStackNavigator';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

type TabIconName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICON_SIZE = 22;

function tabIcon(name: TabIconName, focused: boolean) {
  return (
    <Ionicons name={name} size={TAB_ICON_SIZE} color={focused ? colors.primary : colors.textMuted} />
  );
}

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => tabIcon('grid-outline', focused),
        }}
      />
      <Tab.Screen
        name="MatchesTab"
        component={MatchesStackNavigator}
        options={{
          title: 'Matches',
          tabBarIcon: ({ focused }) => tabIcon('pulse-outline', focused),
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          title: 'Favorites',
          tabBarIcon: ({ focused }) => tabIcon('star-outline', focused),
        }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitle: 'Pro Pick',
          tabBarIcon: ({ focused }) => tabIcon('bar-chart-outline', focused),
        }}
      />
    </Tab.Navigator>
  );
}
