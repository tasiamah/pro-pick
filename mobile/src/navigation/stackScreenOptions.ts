import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';

export const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' },
  contentStyle: { backgroundColor: colors.background },
};
