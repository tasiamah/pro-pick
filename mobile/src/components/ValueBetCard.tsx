import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Match, ValueBet } from '../api/types';
import { colors, radii, spacing, typography } from '../theme';
import { getTeamName } from '../utils/matchDisplay';
import { formatKickoff, formatOdd, formatPercent } from './formatters';
import {
  formatPredictedOutcomeLabel,
  type RecommendedOutcome,
} from './matchCard/matchCardUtils';

type ValueBetCardProps = {
  valueBet: ValueBet;
  match: Match;
  onPress?: () => void;
};

export function ValueBetCard({ valueBet, match, onPress }: ValueBetCardProps) {
  const homeName = getTeamName(match.home_team, 'Home');
  const awayName = getTeamName(match.away_team, 'Away');
  const pick = formatPredictedOutcomeLabel(
    valueBet.outcome as RecommendedOutcome,
    homeName,
    awayName,
  );

  const content = (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text numberOfLines={1} style={styles.league}>
          {match.competition_name ?? 'League'}
        </Text>
        <Text numberOfLines={1} style={styles.kickoff}>
          {formatKickoff(match.kickoff)}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.matchup}>
        {homeName} vs {awayName}
      </Text>
      <View style={styles.pickRow}>
        <Text style={styles.pick}>{pick}</Text>
        <Text style={styles.edge}>Edge {formatPercent(valueBet.edge)}</Text>
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.stat}>EV {formatPercent(valueBet.expected_value)}</Text>
        <Text style={styles.stat}>Odd {formatOdd(valueBet.odd)}</Text>
        <Text style={styles.stat}>
          Stake {formatPercent(valueBet.recommended_stake)}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Value bet ${pick}, ${homeName} versus ${awayName}`}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  league: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  kickoff: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 0,
  },
  matchup: {
    ...typography.bodySemibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pickRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  pick: {
    ...typography.label,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  edge: {
    ...typography.labelStrong,
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stat: {
    ...typography.label,
    color: colors.textMuted,
  },
});
