import type { MatchDetail } from '../api/types';

import {
  filterMatchesForBrowse,
  formatCompetitionClause,
  getMatchesEmptyMessage,
  getNoConfidentPicksEmptyState,
  matchesOddsTierFilter,
  matchesSearchFilter,
  matchesStatusFilter,
  selectMatchesForDisplay,
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

const referenceNow = new Date('2026-06-01T00:00:00Z');

describe('matchesFilterUtils', () => {
  it('filters matches by status bucket', () => {
    expect(matchesStatusFilter(baseMatch, 'upcoming', referenceNow)).toBe(true);
    expect(
      matchesStatusFilter({ ...baseMatch, status: 'finished' }, 'completed'),
    ).toBe(true);
    expect(matchesStatusFilter({ ...baseMatch, status: 'live' }, 'live')).toBe(true);
    expect(
      matchesStatusFilter({ ...baseMatch, status: 'finished' }, 'upcoming'),
    ).toBe(false);
  });

  it('excludes matches that already kicked off from upcoming', () => {
    const startedMatch: MatchDetail = {
      ...baseMatch,
      id: 4,
      kickoff: '2026-06-29T15:00:00Z',
    };
    const now = new Date('2026-06-29T18:00:00Z');

    expect(matchesStatusFilter(startedMatch, 'upcoming', now)).toBe(false);
    expect(
      filterMatchesForBrowse([startedMatch], 'upcoming', 'all', '', now).map(
        (match) => match.id,
      ),
    ).toEqual([]);
  });

  it('excludes a match at the exact kickoff instant from upcoming', () => {
    const kickoff = '2026-06-29T15:00:00Z';
    const startingMatch: MatchDetail = { ...baseMatch, id: 5, kickoff };

    expect(matchesStatusFilter(startingMatch, 'upcoming', new Date(kickoff))).toBe(false);
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

  it('sorts upcoming matches by earliest kickoff with undated matches last', () => {
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
      referenceNow,
    );

    expect(filtered.map((match) => match.id)).toEqual([1, 2, 3]);
  });

  it('sorts completed matches by most recent kickoff with undated matches last', () => {
    const undatedMatch: MatchDetail = {
      ...baseMatch,
      id: 3,
      status: 'finished',
      kickoff: null,
    };
    const earlierMatch: MatchDetail = {
      ...baseMatch,
      id: 1,
      status: 'finished',
      kickoff: '2026-06-28T15:00:00Z',
    };
    const laterMatch: MatchDetail = {
      ...baseMatch,
      id: 2,
      status: 'finished',
      kickoff: '2026-06-29T15:00:00Z',
    };

    const filtered = filterMatchesForBrowse(
      [undatedMatch, earlierMatch, laterMatch],
      'completed',
      'all',
      '',
      referenceNow,
    );

    expect(filtered.map((match) => match.id)).toEqual([2, 1, 3]);
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
      referenceNow,
    );

    expect(filtered.map((match) => match.id)).toEqual([1]);
  });

  it('shows every live match but filters completed to confident picks', () => {
    const liveMatches = [
      { ...baseMatch, id: 10, status: 'live' },
      { ...baseMatch, id: 11, status: 'live', prediction: null },
    ];

    expect(selectMatchesForDisplay(liveMatches, 'live')).toEqual(liveMatches);

    const confidentCompleted: MatchDetail = {
      ...baseMatch,
      id: 12,
      status: 'finished',
      prediction: {
        match_id: 12,
        model_version: 'stub',
        prob_home: 0.78,
        prob_draw: 0.14,
        prob_away: 0.08,
      },
    };
    // baseMatch's 0.55 home probability sits below the confidence bar, so a
    // finished match reusing it is dropped just like an unconfident upcoming one.
    const unconfidentCompleted: MatchDetail = {
      ...baseMatch,
      id: 13,
      status: 'finished',
    };

    expect(
      selectMatchesForDisplay(
        [confidentCompleted, unconfidentCompleted],
        'completed',
      ).map((match) => match.id),
    ).toEqual([12]);
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
    expect(getMatchesEmptyMessage('upcoming', 'all', '', true)).toBe(
      'No confident picks right now',
    );
    expect(getMatchesEmptyMessage('completed', 'all', '')).toBe(
      'No completed matches in this list.',
    );
    expect(getMatchesEmptyMessage('completed', 'all', '', true)).toBe(
      'No confident picks right now',
    );
  });

  it('explains when matches exist but none clear the confidence bar', () => {
    const serieMatches = Array.from({ length: 5 }, (_, index) => ({
      ...baseMatch,
      id: index + 1,
      competition_name: 'Serie A',
    }));

    expect(getNoConfidentPicksEmptyState(serieMatches, 'home_week')).toEqual({
      title: 'No confident picks right now',
      subtext:
        'Fixtures in Serie A are on this week. No confident picks for now. Off-season weeks are often like this.',
    });

    expect(
      getNoConfidentPicksEmptyState(
        [
          { ...baseMatch, id: 1, competition_name: 'Serie A' },
          { ...baseMatch, id: 2, competition_name: 'La Liga' },
          { ...baseMatch, id: 3, competition_name: 'La Liga' },
        ],
        'home_week',
      ).subtext,
    ).toBe(
      'Fixtures across Serie A and La Liga are on this week. No confident picks for now. Off-season weeks are often like this.',
    );

    expect(getNoConfidentPicksEmptyState([baseMatch], 'home_day')).toEqual({
      title: 'No confident picks right now',
      subtext:
        'Fixtures in Premier League are on today. No confident picks for now. Off-season weeks are often like this.',
    });

    expect(
      getNoConfidentPicksEmptyState(
        [{ ...baseMatch, competition_name: null }],
        'home_week',
      ).subtext,
    ).toBe(
      'Fixtures are on this week. No confident picks for now. Off-season weeks are often like this.',
    );

    expect(getNoConfidentPicksEmptyState([], 'home_week').subtext).toBe(
      'No fixtures this week. Off-season weeks are often like this.',
    );
  });

  it('formats competition names for the empty state', () => {
    expect(
      formatCompetitionClause(['Serie A']),
    ).toBe(' in Serie A');
    expect(
      formatCompetitionClause(['Serie A', 'La Liga']),
    ).toBe(' across Serie A and La Liga');
    expect(
      formatCompetitionClause(['Serie A', 'La Liga', 'Bundesliga']),
    ).toBe(' across Serie A, La Liga and others');
    expect(formatCompetitionClause([])).toBe('');
  });
});
