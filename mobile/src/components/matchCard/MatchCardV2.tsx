import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
import { MATCH_DETAILS_FOOTER } from '../../constants/matchCardDetails';
import { colors, radii, spacing, typography } from '../../theme';
import { getTeamName } from '../../utils/matchDisplay';
import { formatKickoff } from '../formatters';
import {
  classifyOddsTier,
  formatPredictedOutcomeLabel,
  getConfidence,
  getExplicitMatchInsight,
  getOddForOutcome,
  getRecommendedOutcome,
} from './matchCardUtils';

type MatchCardV2Props = {
  match: Match;
  prediction?: Prediction | null;
  odds?: Odds[] | null;
  compact?: boolean;
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
  compact = false,
  onPress,
  onDetailsPress,
}: MatchCardV2Props) {
  const [hovered, setHovered] = useState(false);
  const primaryOdds = odds?.[0];
  const showAiBlock = prediction != null && primaryOdds != null;
  const homeName = getTeamName(match.home_team, 'Home');
  const awayName = getTeamName(match.away_team, 'Away');

  const detailsHandler = onDetailsPress ?? onPress;
  const oddsTier =
    prediction && primaryOdds
      ? classifyOddsTier(getOddForOutcome(primaryOdds, getRecommendedOutcome(prediction)))
      : null;
  const cardInsight = prediction ? getExplicitMatchInsight(prediction) : null;

  const hoverHandlers =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : undefined;

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        hovered && styles.cardHovered,
      ]}
      {...hoverHandlers}
    >
      <View style={styles.cardBody}>
        <View style={styles.headerRow}>
          <Text numberOfLines={1} style={styles.league}>
            {match.competition_name ?? 'League'}
          </Text>
          <View style={styles.headerActions}>
            <View accessibilityElementsHidden>
              <Ionicons name="notifications-outline" size={18} color={colors.textMuted} />
            </View>
            <HeaderFavoriteStar team={match.home_team} />
            {!compact ? (
              <Text numberOfLines={1} style={styles.kickoff}>
                {formatKickoff(match.kickoff)}
              </Text>
            ) : null}
          </View>
        </View>

        {compact ? (
          <Text numberOfLines={1} style={styles.kickoffCompact}>
            {formatKickoff(match.kickoff)}
          </Text>
        ) : null}

        <View style={styles.teamsBlock}>
          <TeamRow team={match.home_team} fallbackName="Home" />
          <TeamRow team={match.away_team} fallbackName="Away" />
        </View>

        {showAiBlock && prediction && primaryOdds ? (
          <View style={styles.aiBlock}>
            <View style={[styles.aiHeaderRow, compact && styles.aiHeaderRowCompact]}>
              <View style={styles.aiPickGroup}>
                <AiPickLabel />
                <Text
                  numberOfLines={compact ? 2 : undefined}
                  style={[styles.predictedOutcome, compact && styles.predictedOutcomeCompact]}
                >
                  {formatPredictedOutcomeLabel(
                    getRecommendedOutcome(prediction),
                    homeName,
                    awayName,
                  )}
                </Text>
              </View>
              <View style={[styles.badgeRow, compact && styles.badgeRowCompact]}>
                <ConfidenceBadge confidence={getConfidence(prediction)} />
                {oddsTier ? <OddsTierBadge tier={oddsTier} /> : null}
              </View>
            </View>
            {cardInsight ? <InsightBullet text={cardInsight} /> : null}
          </View>
        ) : null}
      </View>

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
    flex: 1,
    padding: spacing.lg,
  },
  cardCompact: {
    justifyContent: 'space-between',
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  cardHovered: {
    borderColor: colors.primary,
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
    flexShrink: 1,
  },
  kickoffCompact: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
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
  aiHeaderRowCompact: {
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  aiPickGroup: {
    gap: spacing.xs,
  },
  predictedOutcome: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  predictedOutcomeCompact: {
    ...typography.bodySmall,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeRowCompact: {
    alignItems: 'flex-start',
  },
  detailsLinkWrap: {
    alignItems: 'center',
    ...MATCH_DETAILS_FOOTER,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    marginBottom: -spacing.lg,
    marginHorizontal: -spacing.lg,
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
});
