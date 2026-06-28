import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { colors } from '../theme';

export const matchDetailScreenOptions: NativeStackNavigationOptions = {
  presentation: 'modal',
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
};
