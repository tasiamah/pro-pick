import { useCallback } from 'react';
import {
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
  AsyncState,
  EmptyState,
  ErrorState,
  LoadingState,
  ValueBetCard,
} from '../components';
import {
  formatKickoff,
  formatOdd,
  formatPercent,
} from '../components/formatters';
import type {
  FavoritesStackParamList,
  HomeStackParamList,
  MatchesStackParamList,
} from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import { formatMatchTeams } from '../utils/matchDisplay';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';
import { parseMatchId } from './matchDetailUtils';

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

type PredictionSectionProps = {
  prediction: Prediction | null;
};

function PredictionSection({ prediction }: PredictionSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Prediction</Text>
      {prediction ? (
        <View style={styles.infoCard}>
          <Text style={styles.modelVersion}>Model {prediction.model_version}</Text>
          <View style={styles.probabilityRow}>
            <ProbabilityItem label="Home" value={prediction.prob_home} />
            <ProbabilityItem label="Draw" value={prediction.prob_draw} />
            <ProbabilityItem label="Away" value={prediction.prob_away} />
          </View>
        </View>
      ) : (
        <EmptyState message="No prediction available" />
      )}
    </View>
  );
}

type ProbabilityItemProps = {
  label: string;
  value: number;
};

function ProbabilityItem({ label, value }: ProbabilityItemProps) {
  return (
    <View style={styles.probabilityItem}>
      <Text style={styles.probabilityLabel}>{label}</Text>
      <Text style={styles.probabilityValue}>{formatPercent(value)}</Text>
    </View>
  );
}

type OddsSectionProps = {
  odds: Odds[];
};

function OddsSection({ odds }: OddsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Odds by market</Text>
      {odds.length > 0 ? (
        <View style={styles.cardList}>
          {odds.map((entry) => (
            <OddsRow key={entry.bookmaker} odds={entry} />
          ))}
        </View>
      ) : (
        <EmptyState message="No odds available" />
      )}
    </View>
  );
}

type OddsRowProps = {
  odds: Odds;
};

function OddsRow({ odds }: OddsRowProps) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.bookmaker}>{odds.bookmaker}</Text>
      <View style={styles.oddsRow}>
        <OddsItem label="Home" value={odds.home} />
        <OddsItem label="Draw" value={odds.draw} />
        <OddsItem label="Away" value={odds.away} />
      </View>
    </View>
  );
}

type OddsItemProps = {
  label: string;
  value: number;
};

function OddsItem({ label, value }: OddsItemProps) {
  return (
    <View style={styles.oddsItem}>
      <Text style={styles.oddsLabel}>{label}</Text>
      <Text style={styles.oddsValue}>{formatOdd(value)}</Text>
    </View>
  );
}

type ValueBetsSectionProps = {
  isLoading: boolean;
  error: unknown;
  valueBets: ValueBet[];
  onRetry: () => void;
};

function ValueBetsSection({
  isLoading,
  error,
  valueBets,
  onRetry,
}: ValueBetsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Value bets</Text>
      <AsyncState
        isLoading={isLoading}
        error={error}
        isEmpty={valueBets.length === 0}
        emptyMessage="No value bets for this match"
        errorMessage="Could not load value bets"
        onRetry={onRetry}
      >
        <View style={styles.cardList}>
          {valueBets.map((valueBet) => (
            <ValueBetCard key={valueBet.id} valueBet={valueBet} />
          ))}
        </View>
      </AsyncState>
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

  const isRefreshing = matchQuery.isRefetching || valueBetsQuery.isRefetching;

  const onRefresh = useCallback(() => {
    void matchQuery.refetch();
    void valueBetsQuery.refetch();
  }, [matchQuery, valueBetsQuery]);

  const onRetry = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  if (matchId == null) {
    return <ErrorState message="Invalid match" />;
  }

  if (isInitialQueryLoad(matchQuery.isLoading, matchQuery.data)) {
    return <LoadingState message="Loading match…" />;
  }

  if (queryErrorForDisplay(matchQuery.error, matchQuery.data)) {
    return <ErrorState message="Could not load match" onRetry={onRetry} />;
  }

  const match = matchQuery.data;
  if (!match) {
    return <EmptyState message="Match not found" />;
  }

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
      <PredictionSection prediction={match.prediction} />
      <OddsSection odds={match.odds ?? []} />
      <ValueBetsSection
        isLoading={isInitialQueryLoad(valueBetsQuery.isLoading, valueBetsQuery.data)}
        error={queryErrorForDisplay(valueBetsQuery.error, valueBetsQuery.data)}
        valueBets={valueBetsQuery.data ?? []}
        onRetry={() => void valueBetsQuery.refetch()}
      />
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
  sectionTitle: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  cardList: {
    gap: spacing.md,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  infoCard: {
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
  modelVersion: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  probabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  probabilityItem: {
    alignItems: 'center',
    flex: 1,
  },
  probabilityLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  probabilityValue: {
    ...typography.bodySemibold,
    color: colors.primary,
  },
  bookmaker: {
    ...typography.bodySemibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  oddsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  oddsItem: {
    alignItems: 'center',
    flex: 1,
  },
  oddsLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  oddsValue: {
    ...typography.bodySemibold,
    color: colors.text,
  },
});
