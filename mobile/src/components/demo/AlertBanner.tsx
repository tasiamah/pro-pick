import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type AlertBannerProps = {
  message: string;
};

export function AlertBanner({ message }: AlertBannerProps) {
  return (
    <View style={styles.banner}>
      <Ionicons name="warning-outline" size={18} color={colors.alertWarning} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.alertWarning,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  text: {
    ...typography.bodySmall,
    color: colors.alertWarning,
    flex: 1,
  },
});
