import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { MatchesScreen } from '../screens/MatchesScreen';
import { stackScreenOptions } from './stackScreenOptions';
import type { MatchesStackParamList } from './types';

const Stack = createNativeStackNavigator<MatchesStackParamList>();

export function MatchesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Matches" component={MatchesScreen} options={{ title: 'Pro Pick' }} />
      <Stack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: 'Pro Pick' }}
      />
    </Stack.Navigator>
  );
}
