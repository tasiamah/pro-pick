import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { screenTitles } from './screenTitles';
import { stackScreenOptions } from './stackScreenOptions';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: screenTitles.home }}
      />
      <Stack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: screenTitles.matchDetail }}
      />
    </Stack.Navigator>
  );
}
