import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatOddsTierLabel, type OddsTier } from './demoUtils';

type OddsTierBadgeProps = {
  tier: OddsTier;
};

export function OddsTierBadge({ tier }: OddsTierBadgeProps) {
  const tierColors = {
    low: colors.oddsLow,
    medium: colors.oddsMedium,
    high: colors.oddsHigh,
  };

  return (
    <View style={[styles.badge, { borderColor: tierColors[tier] }]}>
      <Text style={[styles.text, { color: tierColors[tier] }]}>
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
});
