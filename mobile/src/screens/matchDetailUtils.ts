import type { Odds, Prediction, ValueBet } from '../api/types';
import type { OddsMovement, ValueStatus } from '../components/demo/demoUtils';
import {
  getMatchInsight,
  getOddForOutcome,
  getRecommendedOutcome,
  type RecommendedOutcome,
} from '../components/matchCard/matchCardUtils';

const MOVEMENT_EPSILON = 0.001;
const VALUE_EDGE_THRESHOLD = 0.03;

export type MarketMovements = {
  home: OddsMovement | null;
  draw: OddsMovement | null;
  away: OddsMovement | null;
};

export type MarketAnalysis = {
  outcome: RecommendedOutcome;
  modelProb: number;
  odd: number;
  edge: number;
  recommendedStake: number | null;
  status: ValueStatus;
};

export function parseMatchId(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const id = Number.parseInt(value, 10);
  if (id <= 0) {
    return null;
  }

  return id;
}

export function deriveOddsMovement(
  previous: number | null,
  current: number,
): OddsMovement | null {
  if (previous == null || !Number.isFinite(current)) {
    return null;
  }

  if (current > previous + MOVEMENT_EPSILON) {
    return 'up';
  }

  if (current < previous - MOVEMENT_EPSILON) {
    return 'down';
  }

  return 'flat';
}

export function deriveMarketMovements(
  previous: Odds | null,
  current: Odds | null,
): MarketMovements | null {
  if (!previous || !current) {
    return null;
  }

  return {
    home: deriveOddsMovement(previous.home, current.home),
    draw: deriveOddsMovement(previous.draw, current.draw),
    away: deriveOddsMovement(previous.away, current.away),
  };
}

export function hasSignificantOddsMovement(movements: MarketMovements | null): boolean {
  if (!movements) {
    return false;
  }

  return [movements.home, movements.draw, movements.away].some(
    (movement) => movement === 'up' || movement === 'down',
  );
}

export function impliedProbability(odd: number): number {
  if (!Number.isFinite(odd) || odd <= 0) {
    return 0;
  }

  return 1 / odd;
}

export function computeEdge(modelProb: number, odd: number): number {
  return modelProb - impliedProbability(odd);
}

export function classifyValueStatus(edge: number): ValueStatus {
  if (edge >= VALUE_EDGE_THRESHOLD) {
    return 'value';
  }

  if (edge <= -VALUE_EDGE_THRESHOLD) {
    return 'overpriced';
  }

  if (edge < 0) {
    return 'weak';
  }

  return 'fair';
}

export function findValueBetForOutcome(
  valueBets: ValueBet[],
  outcome: RecommendedOutcome,
): ValueBet | null {
  return valueBets.find((bet) => bet.outcome.toLowerCase() === outcome) ?? null;
}

export function buildMarketAnalysis(
  prediction: Prediction,
  odds: Odds,
  valueBet: ValueBet | null,
): MarketAnalysis {
  const outcome = getRecommendedOutcome(prediction);
  const modelProb =
    outcome === 'home'
      ? prediction.prob_home
      : outcome === 'draw'
        ? prediction.prob_draw
        : prediction.prob_away;
  const odd = valueBet?.odd ?? getOddForOutcome(odds, outcome);
  const edge = valueBet?.edge ?? computeEdge(modelProb, odd);

  return {
    outcome,
    modelProb,
    odd,
    edge,
    recommendedStake: valueBet?.recommended_stake ?? null,
    status: classifyValueStatus(edge),
  };
}

export function getMatchInsights(prediction: Prediction | null): string[] {
  if (!prediction) {
    return [];
  }

  const insights =
    prediction.insights
      ?.map((entry) => entry.trim())
      .filter((entry) => entry.length > 0) ?? [];

  if (insights.length > 0) {
    return insights;
  }

  return [getMatchInsight(prediction)];
}

export function formatStakeReturnLabel(stake: number, odd: number): string {
  if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(odd) || odd <= 0) {
    return 'Stake return unavailable';
  }

  return `${Math.round(stake * 100)}% stake · ${odd.toFixed(2)}x return`;
}
