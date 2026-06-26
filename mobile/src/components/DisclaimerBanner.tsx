import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DISCLAIMER_SHORT } from '../constants/disclaimer';
import { openAbout } from '../navigation/navigationRef';
import { colors, spacing } from '../theme';

export function DisclaimerBanner() {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens about and legal information"
      onPress={openAbout}
      style={({ pressed }) => [
        styles.banner,
        { paddingTop: insets.top + spacing.xs },
        pressed && styles.pressed,
      ]}
    >
      <Text numberOfLines={1} style={styles.text}>
        {DISCLAIMER_SHORT}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.3,
    lineHeight: 13,
    textAlign: 'center',
  },
});
