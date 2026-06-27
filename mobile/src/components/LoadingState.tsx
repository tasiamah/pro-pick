import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, screenStyles, spacing, typography } from '../theme';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <View style={screenStyles.centeredContainer}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
