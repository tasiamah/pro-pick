import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { MatchesScreen } from '../screens/MatchesScreen';

export type RootTabParamList = {
  Dashboard: undefined;
  Matches: undefined;
  Favorites: undefined;
  Analytics: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}
