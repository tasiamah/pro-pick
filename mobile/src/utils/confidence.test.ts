import type { MatchDetail, Prediction } from '../api/types';

import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  filterHighConfidenceMatches,
  isHighConfidenceMatch,
} from './confidence';

function pred(home: number, draw: number, away: number): Prediction {
  return {
    match_id: 1,
    model_version: 'v1',
    prob_home: home,
    prob_draw: draw,
    prob_away: away,
  };
}

function match(id: number, prediction: Prediction | null): MatchDetail {
  return {
    id,
    kickoff: '2026-06-30T15:00:00Z',
    status: 'scheduled',
    home_team: { id: 1, name: 'Home', logo_url: null },
    away_team: { id: 2, name: 'Away', logo_url: null },
    competition_name: 'World Cup',
    odds: [],
    prediction,
  };
}

describe('isHighConfidenceMatch', () => {
  it('is true when the top probability clears the default threshold', () => {
    expect(isHighConfidenceMatch(match(1, pred(0.72, 0.18, 0.1)))).toBe(true);
  });

  it('is true exactly at the threshold', () => {
    expect(
      isHighConfidenceMatch(match(1, pred(DEFAULT_CONFIDENCE_THRESHOLD, 0.2, 0.1))),
    ).toBe(true);
  });

  it('is false below the threshold', () => {
    expect(isHighConfidenceMatch(match(1, pred(0.5, 0.3, 0.2)))).toBe(false);
  });

  it('is false without a prediction', () => {
    expect(isHighConfidenceMatch(match(1, null))).toBe(false);
  });

  it('respects a custom threshold', () => {
    expect(isHighConfidenceMatch(match(1, pred(0.55, 0.25, 0.2)), 0.5)).toBe(true);
    expect(isHighConfidenceMatch(match(1, pred(0.55, 0.25, 0.2)), 0.6)).toBe(false);
  });
});

describe('filterHighConfidenceMatches', () => {
  it('keeps only matches whose pick clears the threshold', () => {
    const matches = [
      match(1, pred(0.8, 0.1, 0.1)),
      match(2, pred(0.45, 0.3, 0.25)),
      match(3, null),
      match(4, pred(0.7, 0.2, 0.1)),
    ];

    expect(filterHighConfidenceMatches(matches).map((m) => m.id)).toEqual([1, 4]);
  });
});
