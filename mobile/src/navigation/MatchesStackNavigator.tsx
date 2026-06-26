import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { MatchesScreen } from '../screens/MatchesScreen';
import { screenTitles } from './screenTitles';
import { StackHeaderTitle } from './StackHeaderTitle';
import { stackScreenOptions } from './stackScreenOptions';
import type { MatchesStackParamList } from './types';

const Stack = createNativeStackNavigator<MatchesStackParamList>();

export function MatchesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          headerTitle: () => (
            <StackHeaderTitle title={screenTitles.matches} reserveSubtitle />
          ),
        }}
      />
      <Stack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: screenTitles.matchDetail }}
      />
    </Stack.Navigator>
  );
}
