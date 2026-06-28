import type { MatchDetail } from '../api/types';

import { MATCHES_DEMO_DATA } from './matchesDemoData';
import { resolveMatchesBrowseSource } from './matchesScreenUtils';

const apiMatch: MatchDetail = {
  id: 1,
  kickoff: '2026-06-28T15:00:00Z',
  status: 'scheduled',
  home_team: { id: 1, name: 'Arsenal', logo_url: null },
  away_team: { id: 2, name: 'Chelsea', logo_url: null },
  competition_name: 'Premier League',
  odds: [{ bookmaker: 'Bet365', home: 2.1, draw: 3.2, away: 3.4 }],
  prediction: {
    match_id: 1,
    model_version: 'stub',
    prob_home: 0.5,
    prob_draw: 0.25,
    prob_away: 0.25,
  },
};

describe('resolveMatchesBrowseSource', () => {
  it('uses API matches when the list is non-empty', () => {
    expect(resolveMatchesBrowseSource([apiMatch], MATCHES_DEMO_DATA)).toEqual({
      matches: [apiMatch],
      isDemoFallback: false,
    });
  });

  it('falls back to demo matches when the API list is empty', () => {
    expect(resolveMatchesBrowseSource([], MATCHES_DEMO_DATA)).toEqual({
      matches: MATCHES_DEMO_DATA,
      isDemoFallback: true,
    });
  });

  it('falls back to demo matches when API data is undefined', () => {
    expect(resolveMatchesBrowseSource(undefined, MATCHES_DEMO_DATA)).toEqual({
      matches: MATCHES_DEMO_DATA,
      isDemoFallback: true,
    });
  });
});
