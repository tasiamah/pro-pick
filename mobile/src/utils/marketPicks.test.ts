import type { MatchDetail } from '../api/types';

import {
  formatAdditionalPicksLabel,
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
