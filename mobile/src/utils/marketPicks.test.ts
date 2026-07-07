import type { MatchDetail } from '../api/types';

import {
  buildPrimaryPredictionPick,
  formatAdditionalPicksLabel,
  getMatchCardDisplayPicks,
  getQualifyingPicksForMatch,
  sortDisplayPicksByConfidence,
  type DisplayPick,
} from './marketPicks';

const baseMatch: MatchDetail = {
  id: 1,
  kickoff: '2026-06-28T15:00:00Z',
  status: 'scheduled',
  home_team: { id: 1, name: 'Spain', logo_url: null },
  away_team: { id: 2, name: 'Austria', logo_url: null },
  competition_name: 'World Cup',
  odds: [{ bookmaker: 'Demo', home: 1.85, draw: 3.4, away: 4.5 }],
  prediction: {
    match_id: 1,
    model_version: 'stub',
    prob_home: 0.52,
    prob_draw: 0.24,
    prob_away: 0.24,
    markets: [
      {
        market: 'btts',
        model_version: 'stub',
        probabilities: { yes: 0.78, no: 0.22 },
        recommended_outcome: 'yes',
        confidence: 0.78,
      },
      {
        market: 'over_under_25',
        model_version: 'stub',
        probabilities: { over: 0.44, under: 0.56 },
        recommended_outcome: 'under',
        confidence: 0.56,
      },
    ],
  },
};

describe('sortDisplayPicksByConfidence', () => {
  it('orders picks from highest confidence to lowest', () => {
    const picks: DisplayPick[] = [
      { market: 'over_under_25', label: 'Under 2.5', confidence: 0.56 },
      { market: 'btts', label: 'BTTS Yes', confidence: 0.78 },
      { market: '1x2', label: 'Spain Win', confidence: 0.52 },
    ];

    expect(sortDisplayPicksByConfidence(picks).map((pick) => pick.market)).toEqual([
      'btts',
      'over_under_25',
      '1x2',
    ]);
  });
});

describe('formatAdditionalPicksLabel', () => {
  it('returns null when there are no extra picks', () => {
    expect(formatAdditionalPicksLabel(0)).toBeNull();
  });

  it('formats the hidden pick count', () => {
    expect(formatAdditionalPicksLabel(2)).toBe('+2 more');
  });
});

describe('getQualifyingPicksForMatch', () => {
  it('keeps only high-confidence markets and sorts them by confidence', () => {
    // 1X2 (0.52) and Over/Under (0.56) are below the 0.70 bar; only BTTS (0.78)
    // clears it.
    const picks = getQualifyingPicksForMatch(baseMatch);
    expect(picks.map((pick) => pick.market)).toEqual(['btts']);
  });
});

describe('getMatchCardDisplayPicks', () => {
  it('shows every market pick for finished matches, sorted, regardless of confidence', () => {
    const finishedMatch: MatchDetail = {
      ...baseMatch,
      status: 'finished',
      home_goals: 1,
      away_goals: 2,
    };

    // Track record: BTTS (0.78), Over/Under (0.56) and the sub-0.70 1X2 (0.52)
    // all show, highest confidence first — not just the 1X2 pick.
    const picks = getMatchCardDisplayPicks(finishedMatch);
    expect(picks.map((pick) => pick.market)).toEqual([
      'btts',
      'over_under_25',
      '1x2',
    ]);
  });

  it('shows the 1X2 pick on finished matches with no secondary markets', () => {
    const finishedMatch: MatchDetail = {
      ...baseMatch,
      status: 'finished',
      home_goals: 0,
      away_goals: 3,
      odds: [],
      prediction: {
        match_id: 1,
        model_version: 'stub',
        prob_home: 0.31,
        prob_draw: 0.29,
        prob_away: 0.4,
      },
    };

    const picks = getMatchCardDisplayPicks(finishedMatch);
    expect(picks).toEqual([
      {
        market: '1x2',
        label: 'Austria Win',
        confidence: 0.4,
        insight: expect.any(String),
      },
    ]);
  });

  it('keeps selectivity for scheduled matches without a qualifying pick', () => {
    const scheduledMatch: MatchDetail = {
      ...baseMatch,
      prediction: {
        match_id: 1,
        model_version: 'stub',
        prob_home: 0.4,
        prob_draw: 0.35,
        prob_away: 0.25,
        markets: [],
      },
    };
    expect(getQualifyingPicksForMatch(scheduledMatch)).toEqual([]);
    expect(getMatchCardDisplayPicks(scheduledMatch)).toEqual([]);
  });
});

describe('buildPrimaryPredictionPick', () => {
  it('returns null when a match has no prediction', () => {
    expect(buildPrimaryPredictionPick({ ...baseMatch, prediction: null })).toBeNull();
  });
});
