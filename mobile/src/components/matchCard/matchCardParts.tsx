import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatPercent } from '../formatters';
import { formatOddsTierLabel, type FormResult, type OddsTier } from './matchCardUtils';

type FormIndicatorProps = {
  form?: FormResult[];
};

export function FormIndicator({ form }: FormIndicatorProps) {
  if (!form?.length) {
    return null;
  }

  return (
    <View style={styles.formRow}>
      {form.map((result, index) => (
        <View
          key={`${result}-${index}`}
          style={[
            styles.formDot,
            result === 'W' && styles.formWin,
            result === 'D' && styles.formDraw,
            result === 'L' && styles.formLoss,
          ]}
        />
      ))}
    </View>
  );
}

type OddsTierBadgeProps = {
  tier: OddsTier;
};

export function OddsTierBadge({ tier }: OddsTierBadgeProps) {
  const tierColors = {
    low: colors.oddsLow,
    medium: colors.oddsMedium,
    high: colors.oddsHigh,
  };

  return (
    <View style={[styles.oddsTierBadge, { borderColor: tierColors[tier] }]}>
      <Text style={[styles.oddsTierText, { color: tierColors[tier] }]}>
        {formatOddsTierLabel(tier)}
      </Text>
    </View>
  );
}

type ConfidenceBadgeProps = {
  confidence: number;
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <View style={styles.confidenceBadge}>
      <Text style={styles.confidenceValue}>{formatPercent(confidence)}</Text>
      <Text style={styles.confidenceLabel}>CONF</Text>
    </View>
  );
}

export function AiPickLabel() {
  return (
    <View style={styles.aiPickRow}>
      <Ionicons name="sparkles" size={14} color={colors.primary} />
      <Text style={styles.aiPickText}>AI PICK</Text>
    </View>
  );
}

type InsightBulletProps = {
  text: string;
};

export function InsightBullet({ text }: InsightBulletProps) {
  return <Text style={styles.insight}>{text}</Text>;
}

type DetailsLinkProps = {
  onPress: () => void;
};

export function DetailsLink({ onPress }: DetailsLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Details"
      onPress={onPress}
      style={({ pressed }) => [styles.detailsLink, pressed && styles.pressed]}
    >
      <Text style={styles.detailsText}>Details {'>'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  formRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  formDot: {
    borderRadius: radii.sm,
    height: 8,
    width: 8,
  },
  formWin: {
    backgroundColor: colors.win,
  },
  formDraw: {
    backgroundColor: colors.draw,
  },
  formLoss: {
    backgroundColor: colors.loss,
  },
  oddsTierBadge: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  oddsTierText: {
    ...typography.badge,
    textTransform: 'uppercase',
  },
  confidenceBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  confidenceValue: {
    ...typography.statValue,
    color: colors.primary,
    fontSize: 18,
    lineHeight: 22,
  },
  confidenceLabel: {
    ...typography.badge,
    color: colors.textMuted,
  },
  aiPickRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  aiPickText: {
    ...typography.badge,
    color: colors.primary,
  },
  insight: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  detailsLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  detailsText: {
    ...typography.bodySemibold,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
