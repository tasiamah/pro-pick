import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type AiPickLabelProps = {
  compact?: boolean;
};

export function AiPickLabel({ compact = false }: AiPickLabelProps) {
  return (
    <View style={styles.row}>
      <Ionicons name="sparkles" size={compact ? 12 : 14} color={colors.primary} />
      <Text style={[styles.text, compact && styles.textCompact]}>AI PICK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  text: {
    ...typography.badge,
    color: colors.primary,
  },
  textCompact: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 13,
  },
});
