import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatOddsTierLabel, type OddsTier } from './demoUtils';

type OddsTierBadgeProps = {
  tier: OddsTier;
  compact?: boolean;
};

export function OddsTierBadge({ tier, compact = false }: OddsTierBadgeProps) {
  const tierColors = {
    low: colors.oddsLow,
    medium: colors.oddsMedium,
    high: colors.oddsHigh,
  };

  return (
    <View style={[styles.badge, compact && styles.badgeCompact, { borderColor: tierColors[tier] }]}>
      <Text
        style={[
          styles.text,
          compact && styles.textCompact,
          { color: tierColors[tier] },
        ]}
      >
        {formatOddsTierLabel(tier)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typography.badge,
    textTransform: 'uppercase',
  },
  badgeCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  textCompact: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 13,
  },
});
