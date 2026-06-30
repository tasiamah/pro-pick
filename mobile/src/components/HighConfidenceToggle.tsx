import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

type HighConfidenceToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function HighConfidenceToggle({
  value,
  onValueChange,
}: HighConfidenceToggleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>High-confidence picks only</Text>
        <Text style={styles.subtitle}>
          Show only matches the AI is most confident about
        </Text>
      </View>
      <Switch
        accessibilityLabel="High-confidence picks only"
        ios_backgroundColor={colors.border}
        onValueChange={onValueChange}
        thumbColor={value ? colors.primary : colors.textMuted}
        trackColor={{ false: colors.border, true: colors.primaryGlow }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  copy: {
    flexShrink: 1,
    gap: spacing.xs / 2,
  },
  title: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
