import type { Odds, Prediction } from '../../api/types';

import { classifyOddsTier } from '../demo/demoUtils';
import {
  formatPredictedOutcomeLabel,
  getConfidence,
  getExplicitMatchInsight,
  getMatchInsight,
  getOddForOutcome,
  getRecommendedOutcome,
} from './matchCardUtils';

const prediction: Prediction = {
  match_id: 1,
  model_version: 'stub',
  prob_home: 0.55,
  prob_draw: 0.25,
  prob_away: 0.2,
};

const odds: Odds = {
  bookmaker: 'Bet365',
  home: 1.85,
  draw: 3.4,
  away: 4.5,
};

describe('matchCardUtils', () => {
  it('derives recommended outcome from prediction probabilities', () => {
    expect(getRecommendedOutcome(prediction)).toBe('home');
    expect(
      getRecommendedOutcome({
        ...prediction,
        prob_home: 0.2,
        prob_draw: 0.5,
        prob_away: 0.3,
      }),
    ).toBe('draw');
    expect(
      getRecommendedOutcome({
        ...prediction,
        prob_home: 0.2,
        prob_draw: 0.2,
        prob_away: 0.6,
      }),
    ).toBe('away');
  });

  it('returns confidence as the highest outcome probability', () => {
    expect(getConfidence(prediction)).toBe(0.55);
  });

  it('maps recommended outcomes to odds and labels', () => {
    expect(getOddForOutcome(odds, 'home')).toBe(1.85);
    expect(formatPredictedOutcomeLabel('home', 'Bournemouth', 'Luton')).toBe(
      'Bournemouth Win',
    );
    expect(formatPredictedOutcomeLabel('draw', 'Bournemouth', 'Luton')).toBe('Draw');
    expect(formatPredictedOutcomeLabel('away', 'Bournemouth', 'Luton')).toBe('Luton Win');
    expect(classifyOddsTier(getOddForOutcome(odds, 'home'))).toBe('low');
  });

  it('uses the first non-empty insight or a fallback message', () => {
    expect(getExplicitMatchInsight(prediction)).toBeNull();
    expect(getMatchInsight(prediction)).toBe(
      'AI model highlights this fixture based on current form and market odds.',
    );
    expect(
      getMatchInsight({
        ...prediction,
        insights: ['Strong home advantage in recent meetings.'],
      }),
    ).toBe('Strong home advantage in recent meetings.');
    expect(
      getMatchInsight({
        ...prediction,
        insights: ['', 'Strong home advantage in recent meetings.'],
      }),
    ).toBe('Strong home advantage in recent meetings.');
  });
});
