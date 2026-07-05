import type { MatchDetail } from '../api/types';
import {
  formatPredictedOutcomeLabel,
  getConfidence,
  getRecommendedOutcome,
} from '../components/matchCard/matchCardUtils';
import { buildDynamicMatchInsight } from '../components/matchCard/matchInsightUtils';
import { getTeamName } from './matchDisplay';
import { isConfidentMarketPick } from './confidence';
import {
  formatMarketPickLabel,
  isSecondaryMarketId,
  type MarketId,
} from './marketLabels';

export type DisplayPick = {
  market: MarketId;
  label: string;
  confidence: number;
  insight?: string | null;
};

export function getQualifyingPicksForMatch(match: MatchDetail): DisplayPick[] {
  const prediction = match.prediction;
  if (!prediction) {
    return [];
  }

  const homeName = getTeamName(match.home_team, 'Home');
  const awayName = getTeamName(match.away_team, 'Away');
  const picks: DisplayPick[] = [];

  if (isConfidentMarketPick(match, '1x2')) {
    picks.push({
      market: '1x2',
      label: formatPredictedOutcomeLabel(
        getRecommendedOutcome(prediction),
        homeName,
        awayName,
      ),
      confidence: getConfidence(prediction),
      insight: buildDynamicMatchInsight(match, prediction),
    });
  }

  for (const marketPick of prediction.markets ?? []) {
    if (!isSecondaryMarketId(marketPick.market)) {
      continue;
    }

    if (!isConfidentMarketPick(match, marketPick.market)) {
      continue;
    }

    picks.push({
      market: marketPick.market,
      label: formatMarketPickLabel(marketPick),
      confidence: marketPick.confidence,
    });
  }

  return sortDisplayPicksByConfidence(picks);
}

export function sortDisplayPicksByConfidence(picks: DisplayPick[]): DisplayPick[] {
  return [...picks].sort((left, right) => right.confidence - left.confidence);
}

export function formatAdditionalPicksLabel(extraPickCount: number): string | null {
  if (extraPickCount <= 0) {
    return null;
  }

  return `+${extraPickCount} more`;
}

export function filterHighConfidenceMatches(matches: MatchDetail[]): MatchDetail[] {
  return filterHighConfidenceMatchesWithPicks(matches).matches;
}

export function filterHighConfidenceMatchesWithPicks(
  matches: MatchDetail[],
): {
  matches: MatchDetail[];
  picksByMatchId: Map<number, DisplayPick[]>;
} {
  const visible: MatchDetail[] = [];
  const picksByMatchId = new Map<number, DisplayPick[]>();

  for (const match of matches) {
    const picks = getQualifyingPicksForMatch(match);
    if (picks.length === 0) {
      continue;
    }

    visible.push(match);
    picksByMatchId.set(match.id, picks);
  }

  return { matches: visible, picksByMatchId };
}
