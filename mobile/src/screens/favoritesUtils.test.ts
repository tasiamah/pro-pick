import { sortMatchesByKickoff } from './favoritesUtils';
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

describe('sortMatchesByKickoff', () => {
  it('orders matches by earliest kickoff with undated matches last', () => {
    const undated = createMatch({ id: 3, kickoff: null });
    const later = createMatch({ id: 2, kickoff: '2026-06-29T15:00:00Z' });
    const earlier = createMatch({ id: 1, kickoff: '2026-06-24T15:00:00Z' });

    const sorted = sortMatchesByKickoff([undated, later, earlier]);

    expect(sorted.map((match) => match.id)).toEqual([1, 2, 3]);
  });

  it('does not mutate the input array', () => {
    const matches = [
      createMatch({ id: 2, kickoff: '2026-06-29T15:00:00Z' }),
      createMatch({ id: 1, kickoff: '2026-06-24T15:00:00Z' }),
    ];

    sortMatchesByKickoff(matches);

    expect(matches.map((match) => match.id)).toEqual([2, 1]);
  });
});
