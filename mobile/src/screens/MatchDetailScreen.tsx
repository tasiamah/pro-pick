import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMatch, useValueBets } from '../api/hooks';
import type { MatchDetail, MarketPick, Odds, Prediction, ValueBet } from '../api/types';
import {
  AlertBanner,
  ConfidenceBadge,
  ConfidenceRing,
  EmptyState,
  ErrorState,
  LoadingState,
  NumberedInsightBullet,
  OddsMarketCard,
  ProbabilityBarChart,
  ValueStatusBadge,
} from '../components';
import { formatOdd } from '../components/formatters';
import {
  getConfidence,
  getRecommendedOutcome,
} from '../components/matchCard/matchCardUtils';
import type {
  FavoritesStackParamList,
  HomeStackParamList,
  MatchesStackParamList,
} from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import { formatMatchTeams } from '../utils/matchDisplay';
import {
  formatMarketPickLabel,
  formatMarketSectionTitle,
  isSecondaryMarketId,
} from '../utils/marketLabels';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';
import { shouldUseMatchDetailTwoColumnLayout } from './matchDetailLayoutUtils';
import {
  buildAllMarketAnalyses,
  deriveMarketMovements,
  formatEdgeLabel,
  formatOutcomeAnalysisLabel,
  formatRecommendedOutcomeHeadline,
  formatStakeReturnUsd,
  getMatchInsights,
  hasSignificantOddsMovement,
  impliedProbability,
  parseMatchId,
  resolveEdgeBarWidthPercent,
  type MarketAnalysis,
  type MarketMovements,
} from './matchDetailUtils';

type MatchDetailProps =
  | NativeStackScreenProps<HomeStackParamList, 'MatchDetail'>
  | NativeStackScreenProps<MatchesStackParamList, 'MatchDetail'>
  | NativeStackScreenProps<FavoritesStackParamList, 'MatchDetail'>;

type MatchDetailModalHeaderProps = {
  match: MatchDetail;
  onClose: () => void;
};

function MatchDetailModalHeader({ match, onClose }: MatchDetailModalHeaderProps) {
  return (
    <View style={styles.modalHeader}>
      <View style={styles.modalHeaderCopy}>
        <Text style={styles.modalTitle}>
          {formatMatchTeams(match.home_team, match.away_team)}
        </Text>
        {match.competition_name ? (
          <Text style={styles.modalSubtitle}>{match.competition_name}</Text>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel="Close match detail"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onClose}
        style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
      >
        <Ionicons color={colors.textMuted} name="close" size={24} />
      </Pressable>
    </View>
  );
}

type AiConfidenceSectionProps = {
  prediction: Prediction;
};

function AiConfidenceSection({ prediction }: AiConfidenceSectionProps) {
  const confidencePercent = Math.round(getConfidence(prediction) * 100);
  const outcome = getRecommendedOutcome(prediction);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.aiConfidenceRow}>
        <View style={styles.aiConfidenceRingBlock}>
          <ConfidenceRing value={confidencePercent} />
          <Text style={styles.aiConfidenceCaption}>AI Confidence</Text>
        </View>
        <View style={styles.aiConfidenceCopy}>
          <Text style={styles.recommendedHeadline}>
            {formatRecommendedOutcomeHeadline(outcome)}
          </Text>
          <Text style={styles.recommendedCaption}>Recommended Pick</Text>
        </View>
      </View>
    </View>
  );
}

type KeyInsightsSectionProps = {
  insights: string[];
};

function KeyInsightsSection({ insights }: KeyInsightsSectionProps) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>Key Insights</Text>
      <View style={styles.insightsList}>
        {insights.map((insight, index) => (
          <NumberedInsightBullet index={index + 1} key={`${index}-${insight}`} text={insight} />
        ))}
      </View>
    </View>
  );
}

type SecondaryMarketCardProps = {
  pick: MarketPick;
  homeName: string;
  awayName: string;
};

function SecondaryMarketCard({ pick, homeName, awayName }: SecondaryMarketCardProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.secondaryMarketHeader}>
        <Text style={styles.secondaryMarketTitle}>
          {formatMarketSectionTitle(pick.market)}
        </Text>
        <ConfidenceBadge confidence={pick.confidence} />
      </View>
      <Text style={styles.secondaryMarketPick}>
        {formatMarketPickLabel(pick, homeName, awayName)}
      </Text>
      <Text style={styles.secondaryMarketMeta}>
        Model confidence {Math.round(pick.confidence * 100)}%
      </Text>
    </View>
  );
}

type SecondaryMarketsSectionProps = {
  markets: MarketPick[];
  homeName: string;
  awayName: string;
};

function SecondaryMarketsSection({
  markets,
  homeName,
  awayName,
}: SecondaryMarketsSectionProps) {
  const ordered = markets.filter((pick) => isSecondaryMarketId(pick.market));

  if (ordered.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>More AI Markets</Text>
      <View style={styles.secondaryMarketList}>
        {ordered.map((pick) => (
          <SecondaryMarketCard
            awayName={awayName}
            homeName={homeName}
            key={pick.market}
            pick={pick}
          />
        ))}
      </View>
    </View>
  );
}

type LiveMarketDataSectionProps = {
  odds: Odds;
  movements: MarketMovements | null;
  onUpdateOdds: () => void;
  isUpdating: boolean;
  showMovementAlert: boolean;
  oddsUpdatedLabel: string;
};

function LiveMarketDataSection({
  odds,
  movements,
  onUpdateOdds,
  isUpdating,
  showMovementAlert,
  oddsUpdatedLabel,
}: LiveMarketDataSectionProps) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Live Market Data</Text>
        <Pressable
          accessibilityLabel="Update odds"
          accessibilityRole="button"
          accessibilityState={{ disabled: isUpdating }}
          disabled={isUpdating}
          onPress={onUpdateOdds}
          style={({ pressed }) => [
            styles.updateButton,
            isUpdating && styles.updateButtonDisabled,
            pressed && !isUpdating && styles.pressed,
          ]}
        >
          <Ionicons color={colors.text} name="sync-outline" size={16} />
          <Text style={styles.updateButtonText}>
            {isUpdating ? 'Updating…' : 'Update Odds'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.liveOddsHeader}>
        <Text style={styles.liveOddsLabel}>LIVE ODDS</Text>
        <View style={styles.liveOddsMeta}>
          <Ionicons color={colors.textMuted} name="time-outline" size={14} />
          <Text style={styles.liveOddsMetaText}>{oddsUpdatedLabel}</Text>
        </View>
      </View>

      <View style={styles.oddsRow}>
        <OddsMarketCard label="Home Win" movement={movements?.home} price={odds.home} />
        <OddsMarketCard label="Draw" movement={movements?.draw} price={odds.draw} />
        <OddsMarketCard label="Away Win" movement={movements?.away} price={odds.away} />
      </View>

      <Text style={styles.oddsSource}>Source: {odds.bookmaker.toLowerCase()}</Text>

      {showMovementAlert ? (
        <AlertBanner message="Significant Odds Movement Detected" />
      ) : null}
    </View>
  );
}

type MarketAnalysisOutcomeCardProps = {
  analysis: MarketAnalysis;
};

function MarketAnalysisOutcomeCard({ analysis }: MarketAnalysisOutcomeCardProps) {
  const edgeColor = analysis.edge >= 0 ? colors.win : colors.loss;
  const edgeWidth = resolveEdgeBarWidthPercent(analysis.edge);

  return (
    <View style={styles.analysisCard}>
      <View style={styles.analysisCardHeader}>
        <Text style={styles.analysisOutcomeLabel}>
          {formatOutcomeAnalysisLabel(analysis.outcome)}
        </Text>
        <ValueStatusBadge status={analysis.status} />
      </View>

      <View style={styles.analysisMetricsRow}>
        <View style={styles.analysisMetric}>
          <Text style={styles.analysisMetricLabel}>AI Probability</Text>
          <Text style={[styles.analysisMetricValue, styles.metricGreen]}>
            {formatPercent(analysis.modelProb, 1)}
          </Text>
        </View>
        <View style={styles.analysisMetric}>
          <Text style={styles.analysisMetricLabel}>Market Implied</Text>
          <Text style={[styles.analysisMetricValue, styles.metricBlue]}>
            {formatPercent(impliedProbability(analysis.odd), 1)}
          </Text>
        </View>
        <View style={styles.analysisMetric}>
          <Text style={styles.analysisMetricLabel}>Odds</Text>
          <Text style={styles.analysisMetricValue}>{formatOdd(analysis.odd)}</Text>
        </View>
      </View>

      <Text style={styles.stakeReturn}>{formatStakeReturnUsd(analysis.odd)}</Text>

      <View style={styles.edgeTrack}>
        <View
          style={[
            styles.edgeFill,
            { backgroundColor: edgeColor, width: `${edgeWidth}%` },
          ]}
        />
      </View>
      <Text style={[styles.edgeLabel, { color: edgeColor }]}>
        {formatEdgeLabel(analysis.edge)}
      </Text>
    </View>
  );
}

type MarketAnalysisSectionProps = {
  prediction: Prediction;
  odds: Odds;
  valueBets: ValueBet[];
};

function MarketAnalysisSection({ prediction, odds, valueBets }: MarketAnalysisSectionProps) {
  const analyses = buildAllMarketAnalyses(prediction, odds, valueBets);

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionEyebrow}>AI VS MARKET ANALYSIS</Text>
      <View style={styles.analysisList}>
        {analyses.map((analysis) => (
          <MarketAnalysisOutcomeCard analysis={analysis} key={analysis.outcome} />
        ))}
      </View>
    </View>
  );
}

function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  if (decimals > 0) {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  return `${Math.round(value * 100)}%`;
}

export function MatchDetailScreen({ navigation, route }: MatchDetailProps) {
  const { width } = useWindowDimensions();
  const twoColumn = shouldUseMatchDetailTwoColumnLayout(width);
  const matchId = parseMatchId(route.params.matchId);

  const matchQuery = useMatch(matchId ?? 0);
  const valueBetsQuery = useValueBets(
    { match_id: matchId ?? undefined },
    { enabled: matchId != null },
  );

  const [oddsBaseline, setOddsBaseline] = useState<Odds | null>(null);
  const [marketMovements, setMarketMovements] = useState<MarketMovements | null>(null);
  const [isUpdatingOdds, setIsUpdatingOdds] = useState(false);

  const match = matchQuery.data;
  const primaryOdds = match?.odds?.[0] ?? null;

  const insights = useMemo(
    () => getMatchInsights(match?.prediction ?? null),
    [match?.prediction],
  );

  const activeMovements = marketMovements;
  const showMovementAlert = hasSignificantOddsMovement(activeMovements);
  const isRefreshing = matchQuery.isRefetching || valueBetsQuery.isRefetching;

  const onClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setMarketMovements(null);
    setOddsBaseline(null);
    void matchQuery.refetch();
    void valueBetsQuery.refetch();
  }, [matchQuery, valueBetsQuery]);

  const onRetry = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const onUpdateOdds = useCallback(async () => {
    const baseline = oddsBaseline ?? primaryOdds;
    if (!baseline) {
      return;
    }

    setIsUpdatingOdds(true);
    try {
      const result = await matchQuery.refetch();
      const updatedOdds = result.data?.odds?.[0] ?? null;
      if (updatedOdds) {
        setMarketMovements(deriveMarketMovements(baseline, updatedOdds));
        setOddsBaseline(updatedOdds);
      }
    } finally {
      setIsUpdatingOdds(false);
    }
  }, [matchQuery, oddsBaseline, primaryOdds]);

  if (matchId == null) {
    return <ErrorState message="Invalid match" onRetry={onClose} />;
  }

  if (isInitialQueryLoad(matchQuery.isLoading, matchQuery.data)) {
    return <LoadingState message="Loading match…" />;
  }

  if (queryErrorForDisplay(matchQuery.error, matchQuery.data)) {
    return <ErrorState message="Could not load match" onRetry={onRetry} />;
  }

  if (!match) {
    return <EmptyState message="Match not found" />;
  }

  const prediction = match.prediction;
  const oddsUpdatedLabel = marketMovements ? 'just now' : 'Latest available';
  const homeName = match.home_team.name;
  const awayName = match.away_team.name;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          colors={[colors.primary]}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          tintColor={colors.primary}
        />
      }
      style={styles.screen}
    >
      <View style={[styles.modalPanel, twoColumn && styles.modalPanelWide]}>
        <MatchDetailModalHeader match={match} onClose={onClose} />

        <View style={[styles.contentGrid, twoColumn && styles.contentGridTwoColumn]}>
          <View style={styles.leftColumn}>
            {prediction ? (
              <>
                <AiConfidenceSection prediction={prediction} />
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Win Probabilities</Text>
                  <View style={styles.sectionCard}>
                    <ProbabilityBarChart
                      away={prediction.prob_away}
                      draw={prediction.prob_draw}
                      home={prediction.prob_home}
                    />
                  </View>
                </View>
              </>
            ) : (
              <EmptyState message="No prediction available" />
            )}

            {insights.length > 0 ? <KeyInsightsSection insights={insights} /> : null}

            {prediction?.markets ? (
              <SecondaryMarketsSection
                awayName={awayName}
                homeName={homeName}
                markets={prediction.markets}
              />
            ) : null}
          </View>

          <View style={styles.rightColumn}>
            {primaryOdds ? (
              <LiveMarketDataSection
                isUpdating={isUpdatingOdds}
                movements={activeMovements}
                odds={primaryOdds}
                oddsUpdatedLabel={oddsUpdatedLabel}
                onUpdateOdds={() => void onUpdateOdds()}
                showMovementAlert={showMovementAlert}
              />
            ) : (
              <EmptyState message="No odds available" />
            )}

            {prediction && primaryOdds ? (
              <MarketAnalysisSection
                odds={primaryOdds}
                prediction={prediction}
                valueBets={valueBetsQuery.data ?? []}
              />
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalPanel: {
    gap: spacing.lg,
    width: '100%',
  },
  modalPanelWide: {
    alignSelf: 'center',
    maxWidth: 1120,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  modalHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  modalTitle: {
    ...typography.titleLarge,
    color: colors.text,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  contentGrid: {
    gap: spacing.xl,
  },
  contentGridTwoColumn: {
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 1,
    gap: spacing.xl,
  },
  rightColumn: {
    flex: 1,
    gap: spacing.xl,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  sectionEyebrow: {
    ...typography.badge,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  sectionCard: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  aiConfidenceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  aiConfidenceRingBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiConfidenceCaption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  aiConfidenceCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  recommendedHeadline: {
    ...typography.titleLarge,
    color: colors.primary,
    fontSize: 28,
    lineHeight: 34,
  },
  recommendedCaption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  insightsList: {
    gap: spacing.sm,
  },
  secondaryMarketList: {
    gap: spacing.md,
  },
  secondaryMarketHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryMarketTitle: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  secondaryMarketPick: {
    ...typography.titleLarge,
    color: colors.primary,
    fontSize: 22,
    lineHeight: 28,
  },
  secondaryMarketMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  updateButton: {
    alignItems: 'center',
    backgroundColor: colors.marketBlue,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    ...typography.label,
    color: colors.text,
  },
  liveOddsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  liveOddsLabel: {
    ...typography.badge,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  liveOddsMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  liveOddsMetaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  oddsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  oddsSource: {
    ...typography.caption,
    color: colors.textMuted,
  },
  analysisList: {
    gap: spacing.md,
  },
  analysisCard: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  analysisCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analysisOutcomeLabel: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  analysisMetricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  analysisMetric: {
    flex: 1,
    gap: spacing.xs,
  },
  analysisMetricLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  analysisMetricValue: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  metricGreen: {
    color: colors.primary,
  },
  metricBlue: {
    color: colors.marketBlue,
  },
  stakeReturn: {
    ...typography.bodySmall,
    color: colors.text,
  },
  edgeTrack: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    height: spacing.sm,
    overflow: 'hidden',
    width: '100%',
  },
  edgeFill: {
    borderRadius: radii.sm,
    height: '100%',
  },
  edgeLabel: {
    ...typography.caption,
    alignSelf: 'flex-end',
  },
  pressed: {
    opacity: 0.85,
  },
});
