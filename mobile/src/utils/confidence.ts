import type { MatchDetail } from '../api/types';
import { getConfidence } from '../components/matchCard/matchCardUtils';

/**
 * Default minimum probability for a pick to count as "high confidence". Mirrors
 * the backend's `model_confidence_threshold` (the same cut-off behind the
 * reported confident accuracy), so the client filter matches the metric.
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Whether a match carries a prediction the model is confident enough about, i.e.
 * its top outcome probability clears the threshold. Matches without a prediction
 * never count as high confidence.
 */
export function isHighConfidenceMatch(
  match: MatchDetail,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
): boolean {
  return match.prediction != null && getConfidence(match.prediction) >= threshold;
}

/** Keep only matches whose pick clears the confidence threshold. */
export function filterHighConfidenceMatches(
  matches: MatchDetail[],
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
): MatchDetail[] {
  return matches.filter((match) => isHighConfidenceMatch(match, threshold));
}
