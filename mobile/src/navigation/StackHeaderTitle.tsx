import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

type StackHeaderTitleProps = {
  title: string;
  subtitle?: string;
  reserveSubtitle?: boolean;
};

export function StackHeaderTitle({
  title,
  subtitle,
  reserveSubtitle = false,
}: StackHeaderTitleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {reserveSubtitle && !subtitle ? <View style={styles.subtitleReserved} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.sectionSubtitle,
    color: colors.textMuted,
  },
  subtitleReserved: {
    minHeight: typography.sectionSubtitle.lineHeight,
  },
});
