import { StyleSheet, Text, View } from 'react-native';

import { colors, screenStyles, typography } from '../theme';

type EmptyStateProps = {
  message?: string;
};

export function EmptyState({ message = 'No data available' }: EmptyStateProps) {
  return (
    <View style={screenStyles.centeredContainer}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
