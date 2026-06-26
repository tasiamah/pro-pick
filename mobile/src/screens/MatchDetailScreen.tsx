import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMatch, useValueBets } from '../api/hooks';
import type { MatchDetail, Odds, Prediction, ValueBet } from '../api/types';
import {
  AiPickLabel,
  AlertBanner,
  ConfidenceRing,
  EdgeBar,
  EmptyState,
  ErrorState,
  InsightBullet,
  LoadingState,
  OddsMarketCard,
  ProbabilityBarChart,
  SectionHeader,
  ValueStatusBadge,
} from '../components';
import { formatKickoff, formatPercent } from '../components/formatters';
import {
  formatPredictedOutcomeLabel,
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
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';
import {
  buildMarketAnalysis,
  deriveMarketMovements,
  findValueBetForOutcome,
  formatStakeReturnLabel,
  getMatchInsights,
  hasSignificantOddsMovement,
  impliedProbability,
  parseMatchId,
  type MarketMovements,
} from './matchDetailUtils';

type MatchDetailProps =
  | NativeStackScreenProps<HomeStackParamList, 'MatchDetail'>
  | NativeStackScreenProps<MatchesStackParamList, 'MatchDetail'>
  | NativeStackScreenProps<FavoritesStackParamList, 'MatchDetail'>;

type MatchHeaderProps = {
  match: MatchDetail;
};

function MatchHeader({ match }: MatchHeaderProps) {
  return (
    <View style={styles.headerCard}>
      {match.competition_name ? (
        <Text style={styles.competition}>{match.competition_name}</Text>
      ) : null}
      <Text style={styles.teams}>
        {formatMatchTeams(match.home_team, match.away_team)}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{formatKickoff(match.kickoff)}</Text>
        <Text style={styles.status}>{match.status}</Text>
      </View>
    </View>
  );
}

type RecommendedPickSectionProps = {
  prediction: Prediction;
  homeName: string;
  awayName: string;
};

function RecommendedPickSection({
  prediction,
  homeName,
  awayName,
}: RecommendedPickSectionProps) {
  const confidencePercent = Math.round(getConfidence(prediction) * 100);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.recommendedPickRow}>
        <ConfidenceRing value={confidencePercent} />
        <View style={styles.recommendedPickCopy}>
          <AiPickLabel />
          <Text style={styles.recommendedPickLabel}>
            {formatPredictedOutcomeLabel(
              getRecommendedOutcome(prediction),
              homeName,
              awayName,
            )}
          </Text>
          <Text style={styles.confidenceCaption}>
            {confidencePercent}% model confidence
          </Text>
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
    <View style={styles.section}>
      <SectionHeader title="Key Insights" />
      <View style={styles.insightsList}>
        {insights.map((insight, index) => (
          <InsightBullet key={`${index}-${insight}`} text={insight} />
        ))}
      </View>
    </View>
  );
}

type LiveOddsSectionProps = {
  odds: Odds;
  movements: MarketMovements | null;
  onUpdateOdds: () => void;
  isUpdating: boolean;
  showMovementAlert: boolean;
};

function LiveOddsSection({
  odds,
  movements,
  onUpdateOdds,
  isUpdating,
  showMovementAlert,
}: LiveOddsSectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeader subtitle="Home, draw, and away prices" title="Live Odds" />
      <View style={styles.oddsRow}>
        <OddsMarketCard
          label="Home Win"
          movement={movements?.home}
          price={odds.home}
        />
        <OddsMarketCard label="Draw" movement={movements?.draw} price={odds.draw} />
        <OddsMarketCard
          label="Away Win"
          movement={movements?.away}
          price={odds.away}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Update odds"
        accessibilityState={{ disabled: isUpdating }}
        disabled={isUpdating}
        onPress={onUpdateOdds}
        style={({ pressed }) => [
          styles.updateButton,
          isUpdating && styles.updateButtonDisabled,
          pressed && !isUpdating && styles.pressed,
        ]}
      >
        <Text style={styles.updateButtonText}>
          {isUpdating ? 'Updating…' : 'Update Odds'}
        </Text>
      </Pressable>
      {showMovementAlert ? (
        <AlertBanner message="Significant Odds Movement Detected" />
      ) : null}
    </View>
  );
}

type MarketAnalysisSectionProps = {
  prediction: Prediction;
  odds: Odds;
  valueBets: ValueBet[];
};

function MarketAnalysisSection({
  prediction,
  odds,
  valueBets,
}: MarketAnalysisSectionProps) {
  const outcome = getRecommendedOutcome(prediction);
  const valueBet = findValueBetForOutcome(valueBets, outcome);
  const analysis = buildMarketAnalysis(prediction, odds, valueBet);

  return (
    <View style={styles.section}>
      <SectionHeader
        subtitle="Model probability versus market pricing"
        title="AI vs Market Analysis"
      />
      <View style={styles.sectionCard}>
        <ValueStatusBadge status={analysis.status} />
        <View style={styles.analysisStats}>
          <Text style={styles.analysisStat}>
            Model {formatPercent(analysis.modelProb)}
          </Text>
          <Text style={styles.analysisStat}>
            Market {formatPercent(impliedProbability(analysis.odd))}
          </Text>
        </View>
        <EdgeBar edge={analysis.edge} />
        <Text style={styles.stakeReturn}>
          {analysis.recommendedStake != null
            ? formatStakeReturnLabel(analysis.recommendedStake, analysis.odd)
            : 'Stake return unavailable'}
        </Text>
      </View>
    </View>
  );
}

export function MatchDetailScreen({ route }: MatchDetailProps) {
  const matchId = parseMatchId(route.params.matchId);
  const matchQuery = useMatch(matchId ?? 0);
  const valueBetsQuery = useValueBets(
    { match_id: matchId ?? undefined },
    { enabled: matchId != null },
  );
  const [oddsBaseline, setOddsBaseline] = useState<Odds | null>(null);
  const [marketMovements, setMarketMovements] = useState<MarketMovements | null>(
    null,
  );
  const [isUpdatingOdds, setIsUpdatingOdds] = useState(false);

  const match = matchQuery.data;
  const primaryOdds = match?.odds?.[0] ?? null;

  const insights = useMemo(
    () => getMatchInsights(match?.prediction ?? null),
    [match?.prediction],
  );

  const showMovementAlert = hasSignificantOddsMovement(marketMovements);
  const isRefreshing = matchQuery.isRefetching || valueBetsQuery.isRefetching;

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
    return <ErrorState message="Invalid match" />;
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

  const homeName = match.home_team.name;
  const awayName = match.away_team.name;
  const prediction = match.prediction;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <MatchHeader match={match} />

      {prediction ? (
        <>
          <RecommendedPickSection
            awayName={awayName}
            homeName={homeName}
            prediction={prediction}
          />
          <View style={styles.section}>
            <SectionHeader title="Win Probabilities" />
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

      {primaryOdds ? (
        <LiveOddsSection
          isUpdating={isUpdatingOdds}
          movements={marketMovements}
          odds={primaryOdds}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  competition: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  teams: {
    ...typography.title,
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
  recommendedPickRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  recommendedPickCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  recommendedPickLabel: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  confidenceCaption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  insightsList: {
    gap: spacing.sm,
  },
  oddsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  updateButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    ...typography.bodySemibold,
    color: colors.background,
  },
  pressed: {
    opacity: 0.85,
  },
  analysisStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  analysisStat: {
    ...typography.label,
    color: colors.textMuted,
  },
  stakeReturn: {
    ...typography.bodySmall,
    color: colors.text,
  },
});
