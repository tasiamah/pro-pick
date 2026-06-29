import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { matchDetailScreenOptions } from './matchDetailScreenOptions';
import { getFavoritesScreen, getMatchDetailScreen } from './lazyScreens';
import { screenTitles } from './screenTitles';
import { stackScreenOptions } from './stackScreenOptions';
import type { FavoritesStackParamList } from './types';

const Stack = createNativeStackNavigator<FavoritesStackParamList>();

export function FavoritesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Favorites"
        getComponent={getFavoritesScreen}
        options={{ title: screenTitles.favorites }}
      />
      <Stack.Screen
        name="MatchDetail"
        getComponent={getMatchDetailScreen}
        options={matchDetailScreenOptions}
      />
    </Stack.Navigator>
  );
}
