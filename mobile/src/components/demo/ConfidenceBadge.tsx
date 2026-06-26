import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatPercent } from '../formatters';

type ConfidenceBadgeProps = {
  confidence: number;
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.value}>{formatPercent(confidence)}</Text>
      <Text style={styles.label}>CONF</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  value: {
    ...typography.statValue,
    color: colors.primary,
    fontSize: 18,
    lineHeight: 22,
  },
  label: {
    ...typography.badge,
    color: colors.textMuted,
  },
});
