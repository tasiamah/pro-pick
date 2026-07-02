import type { MatchDetail } from '../api/types';
import {
  formatPredictedOutcomeLabel,
  getConfidence,
  getRecommendedOutcome,
} from '../components/matchCard/matchCardUtils';
import { buildDynamicMatchInsight } from '../components/matchCard/matchInsightUtils';
import { getTeamName } from './matchDisplay';
import {
  isConfidentMarketPick,
  slateConfidenceThresholdForMarket,
} from './confidence';
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

export function getQualifyingPicksForMatch(
  match: MatchDetail,
  slate: MatchDetail[],
): DisplayPick[] {
  const prediction = match.prediction;
  if (!prediction) {
    return [];
  }

  const homeName = getTeamName(match.home_team, 'Home');
  const awayName = getTeamName(match.away_team, 'Away');
  const picks: DisplayPick[] = [];

  const bar1x2 = slateConfidenceThresholdForMarket(slate, '1x2');
  if (isConfidentMarketPick(match, '1x2', bar1x2)) {
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

    const bar = slateConfidenceThresholdForMarket(slate, marketPick.market);
    if (!isConfidentMarketPick(match, marketPick.market, bar)) {
      continue;
    }

    picks.push({
      market: marketPick.market,
      label: formatMarketPickLabel(marketPick, homeName, awayName),
      confidence: marketPick.confidence,
    });
  }

  return picks;
}

export function filterHighConfidenceMatches(matches: MatchDetail[]): MatchDetail[] {
  return matches.filter(
    (match) => getQualifyingPicksForMatch(match, matches).length > 0,
  );
}
