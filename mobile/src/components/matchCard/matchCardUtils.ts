import type { Odds, Prediction } from '../../api/types';

import { classifyOddsTier, type OddsTier } from '../demo/demoUtils';

export type RecommendedOutcome = 'home' | 'draw' | 'away';

export { classifyOddsTier, type OddsTier };

export function getRecommendedOutcome(prediction: Prediction): RecommendedOutcome {
  const { prob_home, prob_draw, prob_away } = prediction;

  if (prob_home >= prob_draw && prob_home >= prob_away) {
    return 'home';
  }

  if (prob_draw >= prob_home && prob_draw >= prob_away) {
    return 'draw';
  }

  return 'away';
}

export function getConfidence(prediction: Prediction): number {
  return Math.max(prediction.prob_home, prediction.prob_draw, prediction.prob_away);
}

export function getOddForOutcome(odds: Odds, outcome: RecommendedOutcome): number {
  if (outcome === 'home') {
    return odds.home;
  }

  if (outcome === 'draw') {
    return odds.draw;
  }

  return odds.away;
}

export function formatPredictedOutcomeLabel(
  outcome: RecommendedOutcome,
  homeTeamName: string,
  awayTeamName: string,
): string {
  if (outcome === 'home') {
    return `${homeTeamName} Win`;
  }

  if (outcome === 'away') {
    return `${awayTeamName} Win`;
  }

  return 'Draw';
}

export function getMatchInsight(prediction: Prediction): string {
  const insight = getExplicitMatchInsight(prediction);
  return insight || 'AI model highlights this fixture based on current form and market odds.';
}

export function getExplicitMatchInsight(prediction: Prediction): string | null {
  const insight = prediction.insights
    ?.map((entry) => entry.trim())
    .find((entry) => entry.length > 0);

  return insight ?? null;
}
