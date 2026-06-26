import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Match, Odds, Prediction, Team } from '../../api/types';
import {
  AiPickLabel,
  ConfidenceBadge,
  DetailsLink,
  FormIndicator,
  InsightBullet,
  OddsTierBadge,
} from '../demo';
import { buildFavoriteTeamIds, useFavoritesStore } from '../../store';
import { colors, radii, spacing, typography } from '../../theme';
import { getTeamName } from '../../utils/matchDisplay';
import { formatKickoff } from '../formatters';
import {
  classifyOddsTier,
  formatPredictedOutcomeLabel,
  getConfidence,
  getMatchInsight,
  getOddForOutcome,
  getRecommendedOutcome,
} from './matchCardUtils';

type MatchCardV2Props = {
  match: Match;
  prediction?: Prediction | null;
  odds?: Odds[] | null;
  onPress?: () => void;
  onDetailsPress?: () => void;
};

type TeamRowProps = {
  team: Team;
  fallbackName: string;
};

function HeaderFavoriteStar({ team }: { team: Team }) {
  const teams = useFavoritesStore((state) => state.teams);
  const toggleTeam = useFavoritesStore((state) => state.toggleTeam);
  const favoriteTeamIds = buildFavoriteTeamIds(teams);
  const isFavorite = team.id != null && favoriteTeamIds.has(team.id);

  if (team.id == null) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Favorite ${getTeamName(team, 'team')}`}
      accessibilityState={{ selected: isFavorite }}
      onPress={() => toggleTeam(team)}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={18}
        color={isFavorite ? colors.primary : colors.textMuted}
      />
    </Pressable>
  );
}

function TeamRow({ team, fallbackName }: TeamRowProps) {
  return (
    <View style={styles.teamRow}>
      <Text style={styles.teamName}>{getTeamName(team, fallbackName)}</Text>
      <FormIndicator form={team.form} />
    </View>
  );
}

export function MatchCardV2({
  match,
  prediction,
  odds,
  onPress,
  onDetailsPress,
}: MatchCardV2Props) {
  const primaryOdds = odds?.[0];
  const showAiBlock = prediction != null && primaryOdds != null;
  const homeName = getTeamName(match.home_team, 'Home');
  const awayName = getTeamName(match.away_team, 'Away');

  const detailsHandler = onDetailsPress ?? onPress;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text numberOfLines={1} style={styles.league}>
          {match.competition_name ?? 'League'}
        </Text>
        <View style={styles.headerActions}>
          <View accessibilityElementsHidden>
            <Ionicons name="notifications-outline" size={18} color={colors.textMuted} />
          </View>
          <HeaderFavoriteStar team={match.home_team} />
          <Text style={styles.kickoff}>{formatKickoff(match.kickoff)}</Text>
        </View>
      </View>

      <View style={styles.teamsBlock}>
        <TeamRow team={match.home_team} fallbackName="Home" />
        <TeamRow team={match.away_team} fallbackName="Away" />
      </View>

      {showAiBlock ? (
        <View style={styles.aiBlock}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiPickGroup}>
              <AiPickLabel />
              <Text style={styles.predictedOutcome}>
                {formatPredictedOutcomeLabel(
                  getRecommendedOutcome(prediction),
                  homeName,
                  awayName,
                )}
              </Text>
            </View>
            <View style={styles.badgeRow}>
              <ConfidenceBadge confidence={getConfidence(prediction)} />
              <OddsTierBadge
                tier={classifyOddsTier(
                  getOddForOutcome(primaryOdds, getRecommendedOutcome(prediction)),
                )}
              />
            </View>
          </View>
          <InsightBullet text={getMatchInsight(prediction)} />
        </View>
      ) : null}

      {detailsHandler ? (
        <View style={styles.detailsLinkWrap}>
          <DetailsLink onPress={detailsHandler} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  league: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kickoff: {
    ...typography.caption,
    color: colors.textMuted,
  },
  teamsBlock: {
    gap: spacing.sm,
  },
  teamRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamName: {
    ...typography.bodySemibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  aiBlock: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  aiHeaderRow: {
    gap: spacing.sm,
  },
  aiPickGroup: {
    gap: spacing.xs,
  },
  predictedOutcome: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailsLinkWrap: {
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
});
