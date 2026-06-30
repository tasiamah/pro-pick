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
import { useFavoritesStore } from '../../store';
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
  compact?: boolean;
};

function MatchFavoriteStar({ matchId, label }: { matchId: number; label: string }) {
  const matchIds = useFavoritesStore((state) => state.matchIds);
  const toggleMatch = useFavoritesStore((state) => state.toggleMatch);
  const isFavorite = matchIds.includes(matchId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Favorite ${label}`}
      accessibilityState={{ selected: isFavorite }}
      onPress={() => toggleMatch(matchId)}
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

function TeamRow({ team, fallbackName, compact = false }: TeamRowProps) {
  return (
    <View style={styles.teamRow}>
      <Text
        ellipsizeMode="tail"
        numberOfLines={compact ? 1 : undefined}
        style={[styles.teamName, compact && styles.teamNameCompact]}
      >
        {getTeamName(team, fallbackName)}
      </Text>
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
          <Text numberOfLines={1} style={[styles.league, compact && styles.leagueCompact]}>
            {match.competition_name ?? 'League'}
          </Text>
          <View style={styles.headerActions}>
            <View accessibilityElementsHidden>
              <Ionicons name="notifications-outline" size={18} color={colors.textMuted} />
            </View>
            <MatchFavoriteStar matchId={match.id} label={`${homeName} vs ${awayName}`} />
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
          <TeamRow compact={compact} team={match.home_team} fallbackName="Home" />
          <TeamRow compact={compact} team={match.away_team} fallbackName="Away" />
        </View>

        {showAiBlock && prediction && primaryOdds ? (
          <View style={styles.aiBlock}>
            <View style={[styles.aiHeaderRow, compact && styles.aiHeaderRowCompact]}>
              <View style={styles.aiPickGroup}>
                <AiPickLabel compact={compact} />
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
                <ConfidenceBadge compact={compact} confidence={getConfidence(prediction)} />
                {oddsTier ? <OddsTierBadge compact={compact} tier={oddsTier} /> : null}
              </View>
            </View>
            {cardInsight ? <InsightBullet compact={compact} text={cardInsight} /> : null}
          </View>
        ) : null}
      </View>

      {detailsHandler ? (
        <View style={[styles.detailsLinkWrap, compact && styles.detailsLinkWrapCompact]}>
          <DetailsLink compact={compact} onPress={detailsHandler} />
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
    padding: spacing.md,
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
  leagueCompact: {
    letterSpacing: 0,
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
    letterSpacing: 0,
    lineHeight: 16,
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
  teamNameCompact: {
    ...typography.labelStrong,
    letterSpacing: 0,
    lineHeight: 18,
    marginRight: spacing.xs,
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
    ...typography.labelStrong,
    letterSpacing: 0,
    lineHeight: 18,
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
  detailsLinkWrapCompact: {
    marginBottom: -spacing.md,
    marginHorizontal: -spacing.md,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
