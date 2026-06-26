import type { Odds, Prediction } from '../../api/types';

export type FormResult = 'W' | 'D' | 'L';

export type RecommendedOutcome = 'home' | 'draw' | 'away';

export type OddsTier = 'low' | 'medium' | 'high';

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

export function classifyOddsTier(decimalOdd: number): OddsTier {
  if (decimalOdd < 2) {
    return 'low';
  }

  if (decimalOdd < 3.5) {
    return 'medium';
  }

  return 'high';
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
  const insight = prediction.insights
    ?.map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  return insight || 'AI model highlights this fixture based on current form and market odds.';
}

export function formatOddsTierLabel(tier: OddsTier): string {
  if (tier === 'low') {
    return 'LOW ODDS';
  }

  if (tier === 'medium') {
    return 'MEDIUM ODDS';
  }

  return 'HIGH ODDS';
}
