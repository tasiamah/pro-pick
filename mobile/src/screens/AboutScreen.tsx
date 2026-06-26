import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DISCLAIMER_TEXT } from '../constants/disclaimer';
import {
  BOOKMAKER_INDEPENDENCE_TEXT,
  getPrivacyPolicyUrl,
  RESPONSIBLE_PLAY_TEXT,
} from '../constants/legal';
import { colors, radii, spacing, typography } from '../theme';

type LegalSectionProps = {
  title: string;
  body: string;
};

function LegalSection({ title, body }: LegalSectionProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

export function AboutScreen() {
  const privacyPolicyUrl = getPrivacyPolicyUrl();

  const openPrivacyPolicy = async () => {
    if (!privacyPolicyUrl) {
      return;
    }
    try {
      const supported = await Linking.canOpenURL(privacyPolicyUrl);
      if (!supported) {
        Alert.alert('Privacy policy unavailable', 'No app is available to open the privacy policy.');
        return;
      }
      await Linking.openURL(privacyPolicyUrl);
    } catch {
      Alert.alert(
        'Privacy policy unavailable',
        'The privacy policy could not be opened right now. Please try again later.',
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LegalSection title="Entertainment only" body={DISCLAIMER_TEXT} />
      <LegalSection title="18+ and responsible play" body={RESPONSIBLE_PLAY_TEXT} />
      <LegalSection title="Independent analysis" body={BOOKMAKER_INDEPENDENCE_TEXT} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy</Text>
        <Text style={styles.cardBody}>
          Learn what data Pro Pick collects and how it is used.
        </Text>
        {privacyPolicyUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open privacy policy"
            onPress={openPrivacyPolicy}
            style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
          >
            <Text style={styles.linkText}>Privacy Policy {'>'}</Text>
          </Pressable>
        ) : (
          <Text style={styles.cardBody}>The full privacy policy is coming soon.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  cardBody: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  link: {
    alignSelf: 'flex-start',
  },
  linkText: {
    ...typography.bodySemibold,
    color: colors.primary,
  },
  linkPressed: {
    opacity: 0.85,
  },
});
