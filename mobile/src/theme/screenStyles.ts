import { StyleSheet } from 'react-native';

import { colors } from './colors';
import { radii } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';

export const screenStyles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  screenTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  outlineButton: {
    borderColor: colors.primary,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  outlineButtonText: {
    ...typography.bodySemibold,
    color: colors.primary,
  },
  detailTitle: {
    ...typography.titleLarge,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailSubtitle: {
    ...typography.body,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  detailNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
