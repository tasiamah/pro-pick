import {
  filterMatchesByFavorites,
  matchMatchesFavorites,
  type FavoriteCompetition,
  type FavoriteTeam,
} from './favoritesFilter';
import type { Match } from '../api/types';

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 1,
    kickoff: '2026-06-24T15:00:00Z',
    status: 'scheduled',
    home_team: { id: 10, name: 'Arsenal', logo_url: null },
    away_team: { id: 20, name: 'Chelsea', logo_url: null },
    competition_name: 'Premier League',
    ...overrides,
  };
}

describe('favoritesFilter', () => {
  const favoriteTeams: FavoriteTeam[] = [{ id: 10, name: 'Arsenal' }];
  const favoriteCompetitions: FavoriteCompetition[] = [{ name: 'Premier League' }];

  it('matches favorite home teams', () => {
    const match = createMatch();
    expect(
      matchMatchesFavorites(
        match,
        new Set([10]),
        new Set(),
      ),
    ).toBe(true);
  });

  it('matches favorite competitions', () => {
    const match = createMatch({
      home_team: { id: 99, name: 'Other', logo_url: null },
      away_team: { id: 100, name: 'Guest', logo_url: null },
    });
    expect(
      matchMatchesFavorites(
        match,
        new Set(),
        new Set(['premier league']),
      ),
    ).toBe(true);
  });

  it('filters the match list with union logic', () => {
    const matches = [
      createMatch({ id: 1 }),
      createMatch({
        id: 2,
        home_team: { id: 30, name: 'Bayern', logo_url: null },
        away_team: { id: 40, name: 'Dortmund', logo_url: null },
        competition_name: 'Bundesliga',
      }),
    ];

    expect(filterMatchesByFavorites(matches, favoriteTeams, favoriteCompetitions)).toEqual([
      matches[0],
    ]);
  });
});
