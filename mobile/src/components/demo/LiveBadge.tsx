import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type LiveBadgeProps = {
  label?: string;
};

export function LiveBadge({ label = 'Live' }: LiveBadgeProps) {
  return (
    <View style={styles.pill}>
      <View style={styles.dot} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  dot: {
    backgroundColor: colors.primary,
    borderRadius: spacing.xs / 2,
    height: spacing.xs,
    width: spacing.xs,
  },
  text: {
    ...typography.badge,
    color: colors.primary,
  },
});
