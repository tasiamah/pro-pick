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
  it('returns qualifying picks sorted by confidence', () => {
    const slate = [
      baseMatch,
      {
        ...baseMatch,
        id: 2,
        prediction: {
          ...baseMatch.prediction!,
          prob_home: 0.45,
          prob_draw: 0.3,
          prob_away: 0.25,
        },
      },
    ];

    const picks = getQualifyingPicksForMatch(baseMatch, slate);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks[0].market).toBe('btts');
  });
});

describe('getMatchCardDisplayPicks', () => {
  it('falls back to the primary 1X2 pick on finished matches without qualifying picks', () => {
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

    const picks = getMatchCardDisplayPicks(finishedMatch, [finishedMatch]);
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
    const slate = [
      scheduledMatch,
      {
        ...baseMatch,
        id: 2,
        prediction: {
          match_id: 2,
          model_version: 'stub',
          prob_home: 0.82,
          prob_draw: 0.1,
          prob_away: 0.08,
        },
      },
    ];

    expect(getQualifyingPicksForMatch(scheduledMatch, slate)).toEqual([]);
    expect(getMatchCardDisplayPicks(scheduledMatch, slate)).toEqual([]);
  });
});

describe('buildPrimaryPredictionPick', () => {
  it('returns null when a match has no prediction', () => {
    expect(buildPrimaryPredictionPick({ ...baseMatch, prediction: null })).toBeNull();
  });
});
