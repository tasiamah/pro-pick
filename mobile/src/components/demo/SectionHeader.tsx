import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: IoniconName;
  iconColor?: string;
};

export function SectionHeader({
  title,
  subtitle,
  icon,
  iconColor,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      {icon ? (
        <Ionicons color={iconColor ?? colors.primary} name={icon} size={20} />
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.sectionSubtitle,
    color: colors.textMuted,
  },
});
