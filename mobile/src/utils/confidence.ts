import type { MatchDetail } from '../api/types';
import { getConfidence } from '../components/matchCard/matchCardUtils';
import { classifyMatchOddsTier } from '../screens/homeMatchUtils';

/**
 * Default minimum probability for a pick to count as "high confidence". Mirrors
 * the backend's `model_confidence_threshold` (the same cut-off behind the
 * reported confident accuracy), so the client filter matches the metric.
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Relaxed threshold for high-odds (underdog) picks. A long price implies a low
 * bookmaker probability, so even a sub-70% model probability on a high-odds pick
 * represents a meaningful edge worth surfacing. We therefore allow high-odds
 * picks through at a lower confidence than short-priced favourites.
 */
export const HIGH_ODDS_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Confidence threshold a match must clear to be shown, picked by odds tier:
 * high-odds picks use the relaxed cut-off, everything else uses the default.
 */
export function confidenceThresholdForMatch(match: MatchDetail): number {
  return classifyMatchOddsTier(match) === 'high'
    ? HIGH_ODDS_CONFIDENCE_THRESHOLD
    : DEFAULT_CONFIDENCE_THRESHOLD;
}

/**
 * Whether a match carries a pick the model is confident enough about. The top
 * outcome probability must clear the threshold for the match's odds tier (lower
 * for high-odds picks). Matches without a prediction never qualify. Pass an
 * explicit `threshold` to override the odds-aware default.
 */
export function isHighConfidenceMatch(
  match: MatchDetail,
  threshold: number = confidenceThresholdForMatch(match),
): boolean {
  return match.prediction != null && getConfidence(match.prediction) >= threshold;
}

/** Keep only matches whose pick clears the (odds-aware) confidence threshold. */
export function filterHighConfidenceMatches(
  matches: MatchDetail[],
  threshold?: number,
): MatchDetail[] {
  return matches.filter((match) => isHighConfidenceMatch(match, threshold));
}
