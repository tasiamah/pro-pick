import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type EmptyStateProps = {
  message?: string;
};

export function EmptyState({ message = 'No data available' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
