import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatOdd } from '../formatters';
import type { OddsMovement } from './demoUtils';

type OddsMarketCardProps = {
  label: string;
  price: number;
  movement?: OddsMovement | null;
};

function MovementIcon({ movement }: { movement?: OddsMovement | null }) {
  if (movement === 'up') {
    return <Ionicons name="arrow-up" size={14} color={colors.win} />;
  }

  if (movement === 'down') {
    return <Ionicons name="arrow-down" size={14} color={colors.loss} />;
  }

  if (movement === 'flat') {
    return <Ionicons name="remove" size={14} color={colors.textMuted} />;
  }

  return null;
}

function MovementLabel({ movement }: { movement?: OddsMovement | null }) {
  if (movement == null) {
    return null;
  }

  return (
    <Text
      style={[
        styles.movementLabel,
        movement === 'up' && styles.movementUp,
        movement === 'down' && styles.movementDown,
      ]}
    >
      {movement}
    </Text>
  );
}

export function OddsMarketCard({ label, price, movement }: OddsMarketCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatOdd(price)}</Text>
        <MovementIcon movement={movement} />
      </View>
      <MovementLabel movement={movement} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.marketBlue,
  },
  priceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  price: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  movementLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'lowercase',
  },
  movementUp: {
    color: colors.win,
  },
  movementDown: {
    color: colors.loss,
  },
});
