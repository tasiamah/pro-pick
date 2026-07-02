import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Match, MatchDetail, Odds, Prediction, Team } from '../../api/types';
import { MatchNotificationsModal } from '../matchNotifications/MatchNotificationsModal';
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
import { getQualifyingPicksForMatch, type DisplayPick } from '../../utils/marketPicks';
import { formatKickoff } from '../formatters';
import {
  classifyOddsTier,
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
  /** Slate used for per-market selectivity; defaults to this match alone. */
  slate?: MatchDetail[];
  /** Precomputed picks; when omitted they are derived from `slate`. */
  qualifyingPicks?: DisplayPick[];
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

type AiPickRowProps = {
  pick: DisplayPick;
  compact: boolean;
  oddsTier?: ReturnType<typeof classifyOddsTier>;
};

function AiPickRow({ pick, compact, oddsTier }: AiPickRowProps) {
  return (
    <View style={[styles.pickRow, compact && styles.pickRowCompact]}>
      <View style={styles.pickCopy}>
        <Text
          numberOfLines={compact ? 2 : undefined}
          style={[styles.predictedOutcome, compact && styles.predictedOutcomeCompact]}
        >
          {pick.label}
        </Text>
      </View>
      <View style={[styles.badgeRow, compact && styles.badgeRowCompact]}>
        <ConfidenceBadge compact={compact} confidence={pick.confidence} />
        {pick.market === '1x2' && oddsTier ? (
          <OddsTierBadge compact={compact} tier={oddsTier} />
        ) : null}
      </View>
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
  slate,
  qualifyingPicks,
}: MatchCardV2Props) {
  const [hovered, setHovered] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const primaryOdds = odds?.[0];
  const homeName = getTeamName(match.home_team, 'Home');
  const awayName = getTeamName(match.away_team, 'Away');

  const resolvedSlate = useMemo(() => {
    if (slate) {
      return slate;
    }
    if ('prediction' in match && match.prediction != null) {
      return [match as MatchDetail];
    }
    if (prediction) {
      return [{ ...(match as MatchDetail), prediction, odds: odds ?? [] }];
    }
    return [];
  }, [match, odds, prediction, slate]);

  const picks = useMemo(() => {
    if (qualifyingPicks) {
      return qualifyingPicks;
    }
    if (resolvedSlate.length === 0 || !prediction) {
      return [];
    }
    const enriched: MatchDetail = {
      ...(match as MatchDetail),
      prediction,
      odds: odds ?? [],
    };
    return getQualifyingPicksForMatch(enriched, resolvedSlate);
  }, [match, odds, prediction, qualifyingPicks, resolvedSlate]);

  const showAiBlock = picks.length > 0 && primaryOdds != null;
  const primaryPick = picks[0];
  const oddsTier =
    prediction && primaryOdds && primaryPick?.market === '1x2'
      ? classifyOddsTier(getOddForOutcome(primaryOdds, getRecommendedOutcome(prediction)))
      : null;

  const detailsHandler = onDetailsPress ?? onPress;

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
            <Pressable
              accessibilityLabel={`Match notifications for ${homeName} vs ${awayName}`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setNotificationsVisible(true)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.textMuted} />
            </Pressable>
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

        {showAiBlock ? (
          <View style={styles.aiBlock}>
            <AiPickLabel compact={compact} />
            <View style={styles.pickList}>
              {picks.map((pick) => (
                <AiPickRow
                  compact={compact}
                  key={pick.market}
                  oddsTier={pick.market === '1x2' ? oddsTier : null}
                  pick={pick}
                />
              ))}
            </View>
            {primaryPick?.insight ? (
              <InsightBullet compact={compact} text={primaryPick.insight} />
            ) : null}
          </View>
        ) : null}
      </View>

      {detailsHandler ? (
        <View style={[styles.detailsLinkWrap, compact && styles.detailsLinkWrapCompact]}>
          <DetailsLink compact={compact} onPress={detailsHandler} />
        </View>
      ) : null}

      <MatchNotificationsModal
        match={match}
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
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
  iconButton: {
    padding: spacing.xs,
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
  pickList: {
    gap: spacing.sm,
  },
  pickRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  pickRowCompact: {
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  pickCopy: {
    flex: 1,
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
