import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatValueStatusLabel, type ValueStatus } from './demoUtils';

type ValueStatusBadgeProps = {
  status: ValueStatus;
};

const statusColors: Record<ValueStatus, string> = {
  overpriced: colors.loss,
  weak: colors.oddsMedium,
  fair: colors.textMuted,
  value: colors.primary,
};

export function ValueStatusBadge({ status }: ValueStatusBadgeProps) {
  const color = statusColors[status];

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{formatValueStatusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typography.badge,
  },
});
