import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Match, Odds, Prediction } from '../api/types';
import { colors, radii, spacing, typography } from '../theme';
import { formatMatchTeams } from '../utils/matchDisplay';
import { formatKickoff, formatOdd, formatPercent } from './formatters';
import { MatchFavoriteActions } from './MatchFavoriteActions';

type MatchCardProps = {
  match: Match;
  prediction?: Prediction | null;
  odds?: Odds[] | null;
  onPress?: () => void;
};

export function MatchCard({ match, prediction, odds, onPress }: MatchCardProps) {
  const primaryOdds = odds?.[0];
  const teamsLabel = formatMatchTeams(match.home_team, match.away_team);
  const mainContent = (
    <>
      {match.competition_name ? (
        <Text style={styles.competition}>{match.competition_name}</Text>
      ) : null}
      <Text style={styles.teams}>{teamsLabel}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{formatKickoff(match.kickoff)}</Text>
        <Text style={styles.status}>{match.status}</Text>
      </View>
      {prediction ? (
        <Text style={styles.prediction}>
          1X2: {formatPercent(prediction.prob_home)} /{' '}
          {formatPercent(prediction.prob_draw)} /{' '}
          {formatPercent(prediction.prob_away)}
        </Text>
      ) : null}
      {primaryOdds ? (
        <Text style={styles.odds}>
          Odds: {formatOdd(primaryOdds.home)} / {formatOdd(primaryOdds.draw)} /{' '}
          {formatOdd(primaryOdds.away)}
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={styles.card}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={teamsLabel}
          onPress={onPress}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {mainContent}
        </Pressable>
      ) : (
        mainContent
      )}
      <MatchFavoriteActions match={match} />
    </View>
  );
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
  competition: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  teams: {
    ...typography.bodySemibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    ...typography.label,
    color: colors.textMuted,
  },
  status: {
    ...typography.label,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  prediction: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  odds: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
