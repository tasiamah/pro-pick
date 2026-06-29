import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { BrandHeaderTitle } from './BrandHeaderTitle';
import { matchDetailScreenOptions } from './matchDetailScreenOptions';
import { getMatchDetailScreen } from './lazyScreens';
import { stackScreenOptions } from './stackScreenOptions';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitleAlign: 'left',
          headerTitle: () => <BrandHeaderTitle />,
        }}
      />
      <Stack.Screen
        name="MatchDetail"
        getComponent={getMatchDetailScreen}
        options={matchDetailScreenOptions}
      />
    </Stack.Navigator>
  );
}
