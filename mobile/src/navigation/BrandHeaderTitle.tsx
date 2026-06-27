import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { screenSubtitles, screenTitles } from './screenTitles';

export function BrandHeaderTitle() {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Ionicons name="flash" size={18} color={colors.background} />
      </View>
      <View>
        <Text style={styles.title}>{screenTitles.home}</Text>
        <Text style={styles.subtitle}>{screenSubtitles.home}</Text>
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
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  title: {
    ...typography.titleLarge,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
