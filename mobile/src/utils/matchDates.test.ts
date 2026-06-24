import {
  buildDateRange,
  filterMatchesByDate,
  startOfUtcDay,
  toUtcDateKey,
} from './matchDates';
import type { Match } from '../api/types';

function createMatch(id: number, kickoff: string): Match {
  return {
    id,
    kickoff,
    status: 'scheduled',
    home_team: { id: 1, name: 'Home', logo_url: null },
    away_team: { id: 2, name: 'Away', logo_url: null },
    competition_name: 'League',
  };
}

describe('matchDates', () => {
  it('builds a UTC date range from the start day', () => {
    const start = startOfUtcDay(new Date('2026-06-24T12:00:00Z'));
    const range = buildDateRange(start, 3);

    expect(range.map(toUtcDateKey)).toEqual(['2026-06-24', '2026-06-25', '2026-06-26']);
  });

  it('filters and sorts matches for the selected day', () => {
    const selectedDate = startOfUtcDay(new Date('2026-06-24T00:00:00Z'));
    const matches = [
      createMatch(1, '2026-06-24T20:00:00Z'),
      createMatch(2, '2026-06-24T15:00:00Z'),
      createMatch(3, '2026-06-25T15:00:00Z'),
    ];

    expect(filterMatchesByDate(matches, selectedDate).map((match) => match.id)).toEqual([
      2, 1,
    ]);
  });
});
