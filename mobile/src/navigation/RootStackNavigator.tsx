import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AboutScreen } from '../screens/AboutScreen';
import { RootNavigator } from './RootNavigator';
import { screenTitles } from './screenTitles';
import { stackScreenOptions } from './stackScreenOptions';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Tabs"
        component={RootNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: screenTitles.about }}
      />
    </Stack.Navigator>
  );
}
