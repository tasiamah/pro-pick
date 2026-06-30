import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type HeroStatProps = {
  label: string;
  value: string;
  caption?: string | null;
};

export function HeroStat({ label, value, caption }: HeroStatProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  value: {
    ...typography.statValue,
    color: colors.primary,
  },
  label: {
    ...typography.badge,
    color: colors.textMuted,
    textAlign: 'center',
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
