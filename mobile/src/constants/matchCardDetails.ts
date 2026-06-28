import { colors, spacing, typography } from '../theme';

export const MATCH_DETAILS_FOOTER = {
  backgroundColor: colors.primaryMuted,
  paddingVertical: spacing.sm,
} as const;

export const MATCH_DETAILS_LINK_TEXT = {
  ...typography.label,
  color: colors.primary,
  textAlign: 'center' as const,
};
