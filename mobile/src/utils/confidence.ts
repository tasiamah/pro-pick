import type { MatchDetail } from '../api/types';
import { getConfidence } from '../components/matchCard/matchCardUtils';
import { classifyMatchOddsTier } from '../screens/homeMatchUtils';
import type { MarketId } from './marketLabels';
import { isSecondaryMarketId } from './marketLabels';

/**
 * Absolute minimum probability for a pick to ever be shown. Below this the model
 * is essentially calling a coin flip, so we skip it regardless of how the rest of
 * the slate looks. This keeps the app selective even on a thin or uncertain day.
 */
export const CONFIDENCE_FLOOR = 0.5;

/**
 * Relaxed floor for high-odds (underdog) picks. A long price implies a low
 * bookmaker probability, so even a sub-floor model probability on a high-odds
 * pick can represent a meaningful edge worth surfacing.
 */
export const HIGH_ODDS_CONFIDENCE_FLOOR = 0.4;

/**
 * Cut-off we never *exceed*. A pick at or above this is always confident enough,
 * no matter how strong the rest of the slate is. Mirrors the backend's
 * `model_confidence_threshold` (the cut-off behind the reported confident
 * accuracy), so a genuinely confident domestic slate behaves like a fixed filter.
 */
export const CANONICAL_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Quantile that defines "top tier". At 0.72 we keep roughly the strongest ~28% of
 * the slate by confidence (everything at or above the 72nd percentile). Tuned
 * strict on purpose: the client wants the AI to pick its spots, so we surface only
 * a minority of each slate rather than most of it.
 */
export const SELECTIVITY_QUANTILE = 0.72;

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

function floorForMatch(match: MatchDetail): number {
  return classifyMatchOddsTier(match) === 'high'
    ? HIGH_ODDS_CONFIDENCE_FLOOR
    : CONFIDENCE_FLOOR;
}

/** Linear-interpolated quantile of an ascending-sorted, non-empty array. */
function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 1) {
    return sortedAsc[0];
  }
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) {
    return sortedAsc[lo];
  }
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
}

function thresholdFromConfidences(confidences: number[]): number {
  if (confidences.length === 0) {
    return CANONICAL_CONFIDENCE_THRESHOLD;
  }
  const sorted = [...confidences].sort((left, right) => left - right);
  const relative = quantile(sorted, SELECTIVITY_QUANTILE);
  return Math.min(
    CANONICAL_CONFIDENCE_THRESHOLD,
    Math.max(CONFIDENCE_FLOOR, relative),
  );
}

/**
 * Confidence bar for the current slate. Rather than a fixed cut-off, we take the
 * top-tier quantile of the slate's confidences and clamp it between the floor and
 * the canonical threshold. Effect: a confident domestic slate settles at the
 * canonical 0.70, while a balanced international slate (model rarely above ~0.6)
 * settles near the floor so its strongest calls still surface instead of the tab
 * going empty. Decoupled from the literal 70% figure on purpose.
 */
export function slateConfidenceThreshold(matches: MatchDetail[]): number {
  const confidences = matches
    .map(matchConfidence)
    .filter((confidence): confidence is number => confidence != null);
  return thresholdFromConfidences(confidences);
}

/** Slate-relative bar for a specific market (1X2 or a secondary market). */
export function slateConfidenceThresholdForMarket(
  matches: MatchDetail[],
  market: MarketId,
): number {
  const confidences = matches
    .map((entry) => secondaryMarketConfidence(entry, market))
    .filter((confidence): confidence is number => confidence != null);
  return thresholdFromConfidences(confidences);
}

/**
 * Whether a single match clears the given slate bar. High-odds picks are judged
 * against their lower floor instead of the bar; everything else must clear the
 * bar. Matches without a prediction never qualify.
 */
export function isConfidentMatch(match: MatchDetail, bar: number): boolean {
  const confidence = matchConfidence(match);
  if (confidence == null) {
    return false;
  }
  const tier = classifyMatchOddsTier(match);
  const threshold = tier === 'high' ? floorForMatch(match) : bar;
  return confidence >= threshold;
}

/** Whether a specific market pick on a match clears its slate bar. */
export function isConfidentMarketPick(
  match: MatchDetail,
  market: MarketId,
  bar: number,
): boolean {
  if (market === '1x2') {
    return isConfidentMatch(match, bar);
  }

  if (!isSecondaryMarketId(market)) {
    return false;
  }

  const confidence = secondaryMarketConfidence(match, market);
  if (confidence == null) {
    return false;
  }

  return confidence >= bar;
}
