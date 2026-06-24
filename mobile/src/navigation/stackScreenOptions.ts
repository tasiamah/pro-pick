import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { colors, typography } from '../theme';

export const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: typography.title,
  contentStyle: { backgroundColor: colors.background },
};
