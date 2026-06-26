import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FavoritesScreen } from '../screens/FavoritesScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { screenTitles } from './screenTitles';
import { stackScreenOptions } from './stackScreenOptions';
import type { FavoritesStackParamList } from './types';

const Stack = createNativeStackNavigator<FavoritesStackParamList>();

export function FavoritesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: screenTitles.favorites }}
      />
      <Stack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: screenTitles.matchDetail }}
      />
    </Stack.Navigator>
  );
}
