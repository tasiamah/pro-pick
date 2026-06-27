import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DISCLAIMER_SHORT } from '../constants/disclaimer';
import { openAbout } from '../navigation/navigationRef';
import { colors, spacing } from '../theme';

export function DisclaimerBanner() {
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens about and legal information"
        onPress={openAbout}
        style={({ pressed }) => [styles.label, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={styles.text}>
          {DISCLAIMER_SHORT}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss disclaimer"
        hitSlop={spacing.sm}
        onPress={() => setDismissed(true)}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flexDirection: 'row',
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  label: {
    flex: 1,
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
  close: {
    paddingLeft: spacing.sm,
  },
});
