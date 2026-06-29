import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { matchDetailScreenOptions } from './matchDetailScreenOptions';
import { screenSubtitles, screenTitles } from './screenTitles';
import { StackHeaderTitle } from './StackHeaderTitle';
import { stackScreenOptions } from './stackScreenOptions';
import type { MatchesStackParamList } from './types';

const Stack = createNativeStackNavigator<MatchesStackParamList>();

export function MatchesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Matches"
        getComponent={() => require('../screens/MatchesScreen').MatchesScreen}
        options={{
          headerTitle: () => (
            <StackHeaderTitle
              subtitle={screenSubtitles.matches}
              title={screenTitles.matches}
            />
          ),
        }}
      />
      <Stack.Screen
        name="MatchDetail"
        getComponent={() => require('../screens/MatchDetailScreen').MatchDetailScreen}
        options={matchDetailScreenOptions}
      />
    </Stack.Navigator>
  );
}
