import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DISCLAIMER_TEXT } from '../constants/disclaimer';
import { colors, spacing, typography } from '../theme';

export function DisclaimerBanner() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Text accessibilityRole="text" style={styles.text}>
        {DISCLAIMER_TEXT}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  text: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
