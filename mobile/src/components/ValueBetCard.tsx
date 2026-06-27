import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ValueBet } from '../api/types';
import { colors, radii, spacing, typography } from '../theme';
import { formatOdd, formatOutcome, formatPercent } from './formatters';

type ValueBetCardProps = {
  valueBet: ValueBet;
  onPress?: () => void;
};

export function ValueBetCard({ valueBet, onPress }: ValueBetCardProps) {
  const content = (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.outcome}>{formatOutcome(valueBet.outcome)}</Text>
        <Text style={styles.edge}>Edge {formatPercent(valueBet.edge)}</Text>
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.stat}>EV {formatPercent(valueBet.expected_value)}</Text>
        <Text style={styles.stat}>Odd {formatOdd(valueBet.odd)}</Text>
        <Text style={styles.stat}>
          Confidence {formatPercent(valueBet.confidence)}
        </Text>
      </View>
      <Text style={styles.stake}>
        Stake {formatPercent(valueBet.recommended_stake)}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Value bet ${formatOutcome(valueBet.outcome)}`}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  outcome: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  edge: {
    ...typography.labelStrong,
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  stat: {
    ...typography.label,
    color: colors.textMuted,
  },
  stake: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
