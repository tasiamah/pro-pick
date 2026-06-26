import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '../../theme';

type InsightBulletProps = {
  text: string;
};

export function InsightBullet({ text }: InsightBulletProps) {
  return <Text style={styles.text}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});
