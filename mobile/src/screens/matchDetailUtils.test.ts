import type { Odds, Prediction, ValueBet } from '../api/types';

import {
  buildAllMarketAnalyses,
  buildMarketAnalysis,
  classifyValueStatus,
  deriveMarketMovements,
  deriveOddsMovement,
  formatEdgeLabel,
  formatRecommendedOutcomeHeadline,
  formatStakeReturnLabel,
  formatStakeReturnUsd,
  getMatchInsights,
  hasSignificantOddsMovement,
  isDemoMatchId,
  parseMatchId,
  resolveEdgeBarWidthPercent,
} from './matchDetailUtils';

const baseOdds: Odds = {
  bookmaker: 'Bet365',
  home: 1.85,
  draw: 3.4,
  away: 4.5,
};

const basePrediction: Prediction = {
  match_id: 1,
  model_version: 'stub',
  prob_home: 0.55,
  prob_draw: 0.25,
  prob_away: 0.2,
};

describe('matchDetailUtils', () => {
  it('parses valid match ids', () => {
    expect(parseMatchId('42')).toBe(42);
  });

  it('rejects invalid match ids', () => {
    expect(parseMatchId('sample-home')).toBeNull();
    expect(parseMatchId('42abc')).toBeNull();
    expect(parseMatchId('0')).toBeNull();
  });

  it('accepts demo match ids', () => {
    expect(parseMatchId('-1')).toBe(-1);
    expect(parseMatchId(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    expect(parseMatchId(String(Number.MAX_SAFE_INTEGER + 1))).toBeNull();
    expect(isDemoMatchId(-1)).toBe(true);
    expect(isDemoMatchId(42)).toBe(false);
  });

  it('derives odds movement with epsilon tolerance', () => {
    expect(deriveOddsMovement(null, 2)).toBeNull();
    expect(deriveOddsMovement(2, 2.01)).toBe('up');
    expect(deriveOddsMovement(2, 1.99)).toBe('down');
    expect(deriveOddsMovement(2, 2)).toBe('flat');
  });

  it('derives market movements for each outcome', () => {
    const updatedOdds: Odds = {
      ...baseOdds,
      home: 1.9,
      draw: 3.4,
      away: 4.4,
    };

    expect(deriveMarketMovements(baseOdds, updatedOdds)).toEqual({
      home: 'up',
      draw: 'flat',
      away: 'down',
    });
  });

  it('detects significant odds movement', () => {
    expect(
      hasSignificantOddsMovement({
        home: 'flat',
        draw: 'flat',
        away: 'flat',
      }),
    ).toBe(false);
    expect(
      hasSignificantOddsMovement({
        home: 'up',
        draw: 'flat',
        away: null,
      }),
    ).toBe(true);
  });

  it('classifies value status from edge', () => {
    expect(classifyValueStatus(0.08)).toBe('value');
    expect(classifyValueStatus(-0.08)).toBe('overpriced');
    expect(classifyValueStatus(-0.01)).toBe('weak');
    expect(classifyValueStatus(0.01)).toBe('fair');
  });

  it('builds market analysis from prediction and odds', () => {
    const valueBet: ValueBet = {
      id: 1,
      match_id: 1,
      outcome: 'home',
      model_prob: 0.55,
      odd: 1.85,
      expected_value: 0.02,
      edge: 0.01,
      recommended_stake: 0.03,
      confidence: 0.55,
    };

    expect(buildMarketAnalysis(basePrediction, baseOdds, valueBet)).toEqual({
      outcome: 'home',
      modelProb: 0.55,
      odd: 1.85,
      edge: 0.01,
      recommendedStake: 0.03,
      status: 'value',
    });
    expect(buildMarketAnalysis(basePrediction, baseOdds, null).status).toBe('fair');
  });

  it('returns all non-empty insights with fallback', () => {
    expect(
      getMatchInsights({
        ...basePrediction,
        insights: [' Home form is strong ', ''],
      }),
    ).toEqual(['Home form is strong']);

    expect(getMatchInsights({ ...basePrediction, insights: [] })).toHaveLength(1);
    expect(getMatchInsights(null)).toEqual([]);
  });

  it('builds market analysis for every outcome', () => {
    const analyses = buildAllMarketAnalyses(basePrediction, baseOdds, []);
    expect(analyses).toHaveLength(3);
    expect(analyses.map((entry) => entry.outcome)).toEqual(['home', 'draw', 'away']);
  });

  it('formats recommended outcome headlines', () => {
    expect(formatRecommendedOutcomeHeadline('home')).toBe('HOME WIN');
    expect(formatRecommendedOutcomeHeadline('draw')).toBe('DRAW');
    expect(formatRecommendedOutcomeHeadline('away')).toBe('AWAY WIN');
  });

  it('formats stake return labels', () => {
    expect(formatStakeReturnLabel(0.03, 1.85)).toBe('3% stake · 1.85x return');
    expect(formatStakeReturnLabel(0, 1.85)).toBe('Stake return unavailable');
    expect(formatStakeReturnUsd(1.85)).toBe('$100 stake returns: $185.00');
    expect(formatStakeReturnUsd(0)).toBe('$100 stake returns: $0.00');
  });

  it('formats edge labels', () => {
    expect(formatEdgeLabel(0.052)).toBe('Edge: +5.2%');
    expect(formatEdgeLabel(-0.031)).toBe('Edge: -3.1%');
  });

  it('resolves edge bar width without a fill for zero edge', () => {
    expect(resolveEdgeBarWidthPercent(0)).toBe(0);
    expect(resolveEdgeBarWidthPercent(0.03)).toBe(8);
    expect(resolveEdgeBarWidthPercent(0.12)).toBe(12);
  });
});
