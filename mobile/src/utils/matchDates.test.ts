import {
  addLocalDays,
  buildDateRange,
  buildDateRangeEndingAt,
  buildDateWindowParams,
  filterMatchesByDate,
  resolveMatchAnchorDate,
  startOfLocalDay,
  toLocalDateKey,
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
  it('builds a local date range from the start day', () => {
    const start = startOfLocalDay(new Date(2026, 5, 24, 12, 0));
    const range = buildDateRange(start, 3);

    expect(range.map(toLocalDateKey)).toEqual(['2026-06-24', '2026-06-25', '2026-06-26']);
  });

  it('builds API params spanning the visible date window', () => {
    const start = startOfLocalDay(new Date(2026, 5, 24, 15, 0));
    const end = addLocalDays(start, 7);
    const params = buildDateWindowParams(start, end);

    expect(new Date(params.kickoff_from).getTime()).toBe(start.getTime());
    expect(new Date(params.kickoff_to).getTime()).toBe(end.getTime());
    expect(params.limit).toBe(200);
  });

  it('anchors on the latest kickoff when nothing is upcoming', () => {
    const latestKickoff = new Date(2025, 4, 25, 18, 30).toISOString();
    const anchor = resolveMatchAnchorDate(0, latestKickoff);
    const range = buildDateRangeEndingAt(anchor, 3);

    expect(toLocalDateKey(anchor)).toBe('2025-05-25');
    expect(range.map(toLocalDateKey)).toEqual(['2025-05-23', '2025-05-24', '2025-05-25']);
  });

  it('filters and sorts matches for the selected day', () => {
    const selectedDate = startOfLocalDay(new Date(2026, 5, 24, 0, 0));
    const matches = [
      createMatch(1, new Date(2026, 5, 24, 20, 0).toISOString()),
      createMatch(2, new Date(2026, 5, 24, 15, 0).toISOString()),
      createMatch(3, new Date(2026, 5, 25, 15, 0).toISOString()),
    ];

    expect(filterMatchesByDate(matches, selectedDate).map((match) => match.id)).toEqual([
      2, 1,
    ]);
  });
});
