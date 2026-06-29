import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatPercent } from '../formatters';

type ConfidenceBadgeProps = {
  confidence: number;
  compact?: boolean;
};

export function ConfidenceBadge({ confidence, compact = false }: ConfidenceBadgeProps) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Text style={[styles.value, compact && styles.valueCompact]}>
        {formatPercent(confidence)}
      </Text>
      <Text style={[styles.label, compact && styles.labelCompact]}>CONF</Text>
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
  badgeCompact: {
    minWidth: 44,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  valueCompact: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
  },
  labelCompact: {
    ...typography.micro,
    letterSpacing: 0.2,
  },
});
