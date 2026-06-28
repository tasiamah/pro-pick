import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type NumberedInsightBulletProps = {
  index: number;
  text: string;
};

export function NumberedInsightBullet({ index, text }: NumberedInsightBulletProps) {
  return (
    <View style={styles.row}>
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index}</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  indexBadge: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  indexText: {
    ...typography.badge,
    color: colors.primary,
  },
  text: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
});
