import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, screenStyles, spacing, typography } from '../theme';

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable style={screenStyles.outlineButton} onPress={onRetry}>
          <Text style={screenStyles.outlineButtonText}>Try again</Text>
        </Pressable>
      ) : null}
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
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
