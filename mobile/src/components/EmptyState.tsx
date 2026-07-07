import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, screenStyles, spacing, typography } from '../theme';

type EmptyStateProps = {
  /** Primary empty-state headline. */
  message?: string;
  /** Optional supporting copy shown below the headline. */
  subtext?: string;
};

const NBSP = '\u00A0';

/** Keep the last few words of each sentence on one line to avoid widows. */
function formatSubtextForDisplay(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length <= 3) {
        return sentence.trim();
      }

      const boundTail = words.slice(-3).join(NBSP);
      return [...words.slice(0, -3), boundTail].join(' ');
    })
    .join(' ');
}

export function EmptyState({
  message = 'No data available',
  subtext,
}: EmptyStateProps) {
  if (!subtext) {
    return (
      <View style={screenStyles.centeredContainer}>
        <Text style={styles.plainMessage}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.insetWrap}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.primary} name="sparkles-outline" size={20} />
        </View>
        <Text style={styles.title}>{message}</Text>
        <Text style={styles.subtext}>
          {formatSubtextForDisplay(subtext)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  insetWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    maxWidth: 340,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 40,
  },
  title: {
    ...typography.bodySemibold,
    color: colors.text,
    textAlign: 'center',
  },
  subtext: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
  plainMessage: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
