import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

type FavoriteToggleProps = {
  label: string;
  active: boolean;
  onToggle: () => void;
};

export function FavoriteToggle({ label, active, onToggle }: FavoriteToggleProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${active ? 'Remove' : 'Add'} ${label} favorite`}
      onPress={onToggle}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.icon, active && styles.iconActive]}>{active ? '★' : '☆'}</Text>
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    borderColor: colors.primary,
  },
  icon: {
    ...typography.label,
    color: colors.textMuted,
  },
  iconActive: {
    color: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  labelActive: {
    color: colors.text,
  },
});
