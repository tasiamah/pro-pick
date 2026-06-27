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
    ...typography.metric,
    color: colors.primary,
  },
  label: {
    ...typography.badge,
    color: colors.textMuted,
  },
});
