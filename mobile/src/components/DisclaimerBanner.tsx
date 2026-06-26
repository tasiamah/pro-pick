import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DISCLAIMER_TEXT } from '../constants/disclaimer';
import { PRIVACY_POLICY_URL } from '../constants/legal';
import { colors, spacing, typography } from '../theme';

export function DisclaimerBanner() {
  const insets = useSafeAreaInsets();

  const openPrivacyPolicy = () => {
    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Text accessibilityRole="text" style={styles.text}>
        {DISCLAIMER_TEXT}
      </Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Privacy Policy"
        onPress={openPrivacyPolicy}
      >
        <Text style={styles.link}>Privacy Policy</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  text: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  link: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
