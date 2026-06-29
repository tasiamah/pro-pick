import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '../../theme';

type InsightBulletProps = {
  text: string;
  compact?: boolean;
};

export function InsightBullet({ text, compact = false }: InsightBulletProps) {
  return (
    <Text numberOfLines={compact ? 2 : undefined} style={[styles.text, compact && styles.textCompact]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  textCompact: {
    ...typography.caption,
    letterSpacing: 0,
    lineHeight: 16,
  },
});
