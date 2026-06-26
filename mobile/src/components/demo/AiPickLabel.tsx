import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export function AiPickLabel() {
  return (
    <View style={styles.row}>
      <Ionicons name="sparkles" size={14} color={colors.primary} />
      <Text style={styles.text}>AI PICK</Text>
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
});
