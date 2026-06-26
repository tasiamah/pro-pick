import type { MatchDetail } from '../api/types';

import {
  filterMatchesForBrowse,
  getMatchesEmptyMessage,
  matchesOddsTierFilter,
  matchesSearchFilter,
  matchesStatusFilter,
} from './matchesFilterUtils';

const baseMatch: MatchDetail = {
  id: 1,
  kickoff: '2026-06-28T15:00:00Z',
  status: 'scheduled',
  home_team: { id: 1, name: 'Bournemouth', logo_url: null },
  away_team: { id: 2, name: 'Luton', logo_url: null },
  competition_name: 'Premier League',
  odds: [{ bookmaker: 'Bet365', home: 1.85, draw: 3.4, away: 4.5 }],
  prediction: {
    match_id: 1,
    model_version: 'stub',
    prob_home: 0.55,
    prob_draw: 0.25,
    prob_away: 0.2,
  },
};

describe('matchesFilterUtils', () => {
  it('filters matches by status bucket', () => {
    expect(matchesStatusFilter(baseMatch, 'upcoming')).toBe(true);
    expect(
      matchesStatusFilter({ ...baseMatch, status: 'finished' }, 'completed'),
    ).toBe(true);
    expect(matchesStatusFilter({ ...baseMatch, status: 'live' }, 'live')).toBe(true);
    expect(
      matchesStatusFilter({ ...baseMatch, status: 'finished' }, 'upcoming'),
    ).toBe(false);
  });

  it('filters matches by team or competition search', () => {
    expect(matchesSearchFilter(baseMatch, 'bourn')).toBe(true);
    expect(matchesSearchFilter(baseMatch, 'premier')).toBe(true);
    expect(matchesSearchFilter(baseMatch, 'luton')).toBe(true);
    expect(matchesSearchFilter(baseMatch, 'serie a')).toBe(false);
    expect(matchesSearchFilter(baseMatch, '   ')).toBe(true);
  });

  it('filters matches by odds tier of the recommended outcome', () => {
    expect(matchesOddsTierFilter(baseMatch, 'all')).toBe(true);
    expect(matchesOddsTierFilter(baseMatch, 'low')).toBe(true);
    expect(matchesOddsTierFilter(baseMatch, 'high')).toBe(false);
    expect(matchesOddsTierFilter({ ...baseMatch, prediction: null }, 'low')).toBe(
      false,
    );
  });

  it('sorts undated matches after dated ones', () => {
    const undatedMatch: MatchDetail = {
      ...baseMatch,
      id: 3,
      kickoff: null,
    };
    const laterMatch: MatchDetail = {
      ...baseMatch,
      id: 2,
      kickoff: '2026-06-29T15:00:00Z',
    };

    const filtered = filterMatchesForBrowse(
      [undatedMatch, laterMatch, baseMatch],
      'upcoming',
      'all',
      '',
    );

    expect(filtered.map((match) => match.id)).toEqual([1, 2, 3]);
  });

  it('combines filters and sorts by kickoff', () => {
    const laterMatch: MatchDetail = {
      ...baseMatch,
      id: 2,
      kickoff: '2026-06-29T15:00:00Z',
      home_team: { id: 3, name: 'Arsenal', logo_url: null },
    };

    const filtered = filterMatchesForBrowse(
      [laterMatch, baseMatch],
      'upcoming',
      'all',
      'bourn',
    );

    expect(filtered.map((match) => match.id)).toEqual([1]);
  });

  it('returns contextual empty messages', () => {
    expect(getMatchesEmptyMessage('upcoming', 'all', '')).toBe(
      'No upcoming matches in this list.',
    );
    expect(getMatchesEmptyMessage('live', 'all', '')).toBe(
      'No live matches right now.',
    );
    expect(getMatchesEmptyMessage('upcoming', 'high', '')).toBe(
      'No high odds matches in this list.',
    );
    expect(getMatchesEmptyMessage('upcoming', 'all', 'arsenal')).toBe(
      'No matches match your search.',
    );
  });
});
