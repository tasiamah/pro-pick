import type { MatchDetail } from '../api/types';
import { getConfidence } from '../components/matchCard/matchCardUtils';
import { classifyMatchOddsTier } from '../screens/homeMatchUtils';
import type { MarketId } from './marketLabels';
import { isSecondaryMarketId } from './marketLabels';

/**
 * The bar a normal pick must clear to be shown. The app only surfaces picks the
 * model is genuinely confident about, so this is a fixed high-confidence cut
 * rather than a slate-relative one — a weak slate simply shows fewer (or no)
 * picks instead of the "best of a mediocre bunch". Mirrors the backend's
 * `model_confidence_threshold` (the cut behind the reported confident accuracy).
 */
export const CANONICAL_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Relaxed bar for high-odds (underdog) picks. A long price implies a low
 * bookmaker probability, so the model doesn't need to be as confident for the
 * pick to still represent a genuine edge worth surfacing. This is the "if the
 * odds are high, the confidence doesn't need to be as high" exception.
 */
export const HIGH_ODDS_CONFIDENCE_FLOOR = 0.4;

function matchConfidence(match: MatchDetail): number | null {
  return match.prediction == null ? null : getConfidence(match.prediction);
}

function secondaryMarketConfidence(
  match: MatchDetail,
  market: MarketId,
): number | null {
  if (market === '1x2') {
    return matchConfidence(match);
  }

  const pick = match.prediction?.markets?.find((entry) => entry.market === market);
  return pick?.confidence ?? null;
}

/** The confidence bar a match's 1X2 pick must clear, given its odds tier. */
function confidenceBarForMatch(match: MatchDetail): number {
  return classifyMatchOddsTier(match) === 'high'
    ? HIGH_ODDS_CONFIDENCE_FLOOR
    : CANONICAL_CONFIDENCE_THRESHOLD;
}

/**
 * Whether a match's 1X2 pick is confident enough to show. High-odds picks are
 * judged against the relaxed floor; everything else must clear the fixed
 * high-confidence threshold. Matches without a prediction never qualify.
 */
export function isConfidentMatch(match: MatchDetail): boolean {
  const confidence = matchConfidence(match);
  if (confidence == null) {
    return false;
  }
  return confidence >= confidenceBarForMatch(match);
}

/**
 * Whether a secondary-market pick (BTTS, Over/Under 2.5) is confident enough to
 * surface. Secondary markets always require the high-confidence threshold (the
 * odds-tier relaxation applies only to the primary 1X2 pick).
 */
export function isHighConfidenceSecondaryPick(confidence: number): boolean {
  return confidence >= CANONICAL_CONFIDENCE_THRESHOLD;
}

/** Whether a specific market pick on a match is confident enough to show. */
export function isConfidentMarketPick(match: MatchDetail, market: MarketId): boolean {
  if (market === '1x2') {
    return isConfidentMatch(match);
  }

  if (!isSecondaryMarketId(market)) {
    return false;
  }

  const confidence = secondaryMarketConfidence(match, market);
  if (confidence == null) {
    return false;
  }

  return isHighConfidenceSecondaryPick(confidence);
}
