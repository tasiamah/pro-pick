import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
        getComponent={() => require('../screens/AboutScreen').AboutScreen}
        options={{ title: screenTitles.about }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        getComponent={() => require('../screens/PrivacyPolicyScreen').PrivacyPolicyScreen}
        options={{ title: screenTitles.privacyPolicy }}
      />
    </Stack.Navigator>
  );
}
