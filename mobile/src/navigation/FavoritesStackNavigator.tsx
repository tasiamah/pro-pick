import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { matchDetailScreenOptions } from './matchDetailScreenOptions';
import { screenTitles } from './screenTitles';
import { stackScreenOptions } from './stackScreenOptions';
import type { FavoritesStackParamList } from './types';

const Stack = createNativeStackNavigator<FavoritesStackParamList>();

export function FavoritesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Favorites"
        getComponent={() => require('../screens/FavoritesScreen').FavoritesScreen}
        options={{ title: screenTitles.favorites }}
      />
      <Stack.Screen
        name="MatchDetail"
        getComponent={() => require('../screens/MatchDetailScreen').MatchDetailScreen}
        options={matchDetailScreenOptions}
      />
    </Stack.Navigator>
  );
}
