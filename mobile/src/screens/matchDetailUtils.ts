import type { Odds, Prediction, ValueBet } from '../api/types';
import type { OddsMovement, ValueStatus } from '../components/demo/demoUtils';
import {
  getMatchInsight,
  getOddForOutcome,
  getRecommendedOutcome,
  type RecommendedOutcome,
} from '../components/matchCard/matchCardUtils';

const MOVEMENT_EPSILON = 0.001;
const VALUE_EDGE_THRESHOLD = 0.05;

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
  if (!/^-?\d+$/.test(value)) {
    return null;
  }

  const id = Number.parseInt(value, 10);
  if (id === 0 || !Number.isSafeInteger(id)) {
    return null;
  }

  return id;
}

export function isDemoMatchId(matchId: number): boolean {
  return matchId < 0;
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

function getModelProbability(
  prediction: Prediction,
  outcome: RecommendedOutcome,
): number {
  if (outcome === 'home') {
    return prediction.prob_home;
  }

  if (outcome === 'draw') {
    return prediction.prob_draw;
  }

  return prediction.prob_away;
}

export function formatOutcomeAnalysisLabel(outcome: RecommendedOutcome): string {
  if (outcome === 'home') {
    return 'Home Win';
  }

  if (outcome === 'away') {
    return 'Away Win';
  }

  return 'Draw';
}

export function formatRecommendedOutcomeHeadline(
  outcome: RecommendedOutcome,
): string {
  if (outcome === 'home') {
    return 'HOME WIN';
  }

  if (outcome === 'away') {
    return 'AWAY WIN';
  }

  return 'DRAW';
}

export function buildMarketAnalysisForOutcome(
  prediction: Prediction,
  odds: Odds,
  outcome: RecommendedOutcome,
  valueBet: ValueBet | null,
): MarketAnalysis {
  const modelProb = getModelProbability(prediction, outcome);
  const odd = valueBet?.odd ?? getOddForOutcome(odds, outcome);
  const edge = valueBet?.edge ?? computeEdge(modelProb, odd);
  const status = valueBet ? 'value' : classifyValueStatus(edge);

  return {
    outcome,
    modelProb,
    odd,
    edge,
    recommendedStake: valueBet?.recommended_stake ?? null,
    status,
  };
}

export function buildMarketAnalysis(
  prediction: Prediction,
  odds: Odds,
  valueBet: ValueBet | null,
): MarketAnalysis {
  return buildMarketAnalysisForOutcome(
    prediction,
    odds,
    getRecommendedOutcome(prediction),
    valueBet,
  );
}

export function buildAllMarketAnalyses(
  prediction: Prediction,
  odds: Odds,
  valueBets: ValueBet[],
): MarketAnalysis[] {
  const outcomes: RecommendedOutcome[] = ['home', 'draw', 'away'];

  return outcomes.map((outcome) =>
    buildMarketAnalysisForOutcome(
      prediction,
      odds,
      outcome,
      findValueBetForOutcome(valueBets, outcome),
    ),
  );
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

export function formatStakeReturnUsd(odd: number, stake = 100): string {
  if (!Number.isFinite(odd) || odd <= 0) {
    return `$${stake} stake returns: $0.00`;
  }

  return `$${stake} stake returns: $${(stake * odd).toFixed(2)}`;
}

export function formatEdgeLabel(edge: number): string {
  if (!Number.isFinite(edge)) {
    return 'Edge: —';
  }

  const percent = edge * 100;
  const prefix = percent > 0 ? '+' : '';
  return `Edge: ${prefix}${percent.toFixed(1)}%`;
}

export function resolveEdgeBarWidthPercent(edge: number): number {
  if (!Number.isFinite(edge) || edge === 0) {
    return 0;
  }

  return Math.min(100, Math.max(8, Math.abs(edge) * 100));
}

export const DEMO_ODDS_MOVEMENTS: MarketMovements = {
  home: 'down',
  draw: 'down',
  away: 'down',
};
