import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_SECTIONS,
  type PrivacyPolicySection,
} from '../constants/privacyPolicy';
import { colors, radii, screenStyles, spacing, typography } from '../theme';

function PolicySection({ heading, paragraphs, bullets }: PrivacyPolicySection) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{heading}</Text>
      {paragraphs?.map((paragraph) => (
        <Text key={paragraph} style={styles.cardBody}>
          {paragraph}
        </Text>
      ))}
      {bullets?.map((bullet) => (
        <View key={bullet} style={styles.bulletRow}>
          <Text style={styles.bulletPoint}>{'\u2022'}</Text>
          <Text style={[styles.cardBody, styles.bulletText]}>{bullet}</Text>
        </View>
      ))}
    </View>
  );
}

export function PrivacyPolicyScreen() {
  return (
    <ScrollView style={screenStyles.screenContainer} contentContainerStyle={screenStyles.stackContent}>
      <Text style={styles.lastUpdated}>Last updated: {PRIVACY_POLICY_LAST_UPDATED}</Text>
      <Text style={styles.intro}>{PRIVACY_POLICY_INTRO}</Text>
      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <PolicySection key={section.heading} {...section} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lastUpdated: {
    ...typography.caption,
    color: colors.textMuted,
  },
  intro: {
    ...typography.bodySmall,
    color: colors.text,
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
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bulletPoint: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  bulletText: {
    flex: 1,
  },
});
