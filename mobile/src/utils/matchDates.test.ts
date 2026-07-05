import {
  addLocalDays,
  buildDateRange,
  buildDateRangeEndingAt,
  buildDateWindowParams,
  filterMatchesByDate,
  filterMatchesByWeek,
  formatDateChipLabel,
  localDayKeyToDate,
  parseMatchDate,
  resolveMatchAnchorDate,
  startOfLocalDay,
  startOfLocalWeek,
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

describe('parseMatchDate', () => {
  it('treats a naive API timestamp (no timezone) as UTC', () => {
    // The backend serializes naive UTC, e.g. 17:00 UTC for Ivory Coast vs Norway.
    expect(parseMatchDate('2026-06-30T17:00:00').toISOString()).toBe(
      '2026-06-30T17:00:00.000Z',
    );
  });

  it('parses a naive timestamp identically to its explicit-UTC form', () => {
    expect(parseMatchDate('2026-06-30T17:00:00').getTime()).toBe(
      parseMatchDate('2026-06-30T17:00:00Z').getTime(),
    );
  });

  it('respects an explicit timezone offset when present', () => {
    expect(parseMatchDate('2026-06-30T17:00:00+02:00').toISOString()).toBe(
      '2026-06-30T15:00:00.000Z',
    );
  });
});

describe('matchDates', () => {
  it('round-trips a local day key back to the start of that local day', () => {
    const start = startOfLocalDay(new Date(2026, 5, 24, 9, 30));
    const restored = localDayKeyToDate(toLocalDateKey(start));

    expect(restored.getTime()).toBe(start.getTime());
  });

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

  it('jumps to the next predicted slate when the near window is unpredicted', () => {
    const now = startOfLocalDay(new Date(2026, 6, 4, 0, 0));
    const nextPredictionKickoff = new Date(2026, 7, 21, 19, 0).toISOString();
    const anchor = resolveMatchAnchorDate(1069, null, now, nextPredictionKickoff);

    expect(toLocalDateKey(anchor)).toBe('2026-08-21');
  });

  it('stays on today when the next predicted match is today', () => {
    const now = startOfLocalDay(new Date(2026, 7, 21, 0, 0));
    const nextPredictionKickoff = new Date(2026, 7, 21, 19, 0).toISOString();
    const anchor = resolveMatchAnchorDate(50, null, now, nextPredictionKickoff);

    expect(toLocalDateKey(anchor)).toBe('2026-08-21');
    expect(anchor.getTime()).toBe(now.getTime());
  });

  it('never anchors before today even if a stale prediction kickoff is passed', () => {
    const now = startOfLocalDay(new Date(2026, 7, 21, 0, 0));
    const stale = new Date(2026, 6, 4, 19, 0).toISOString();
    const anchor = resolveMatchAnchorDate(50, null, now, stale);

    expect(anchor.getTime()).toBe(now.getTime());
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

describe('formatDateChipLabel', () => {
  it('labels the current local day as "Today"', () => {
    const now = new Date(2026, 6, 5, 9, 30);
    const today = startOfLocalDay(now);

    expect(formatDateChipLabel(today, now)).toBe('Today');
  });

  it('formats any other day as weekday, month and day', () => {
    const now = new Date(2026, 6, 5, 9, 30);
    const tomorrow = addLocalDays(startOfLocalDay(now), 1);

    expect(formatDateChipLabel(tomorrow, now)).toBe('Mon, Jul 6');
  });
});

describe('startOfLocalWeek', () => {
  it('returns the Monday of the week and is idempotent on a Monday', () => {
    const monday = startOfLocalWeek(new Date(2026, 5, 24, 9, 30));

    expect(monday.getDay()).toBe(1);
    expect(startOfLocalWeek(monday).getTime()).toBe(monday.getTime());
  });

  it('maps Sunday back to the same week Monday', () => {
    const monday = startOfLocalWeek(new Date(2026, 5, 24, 9, 30));
    const sunday = addLocalDays(monday, 6);

    expect(sunday.getDay()).toBe(0);
    expect(startOfLocalWeek(sunday).getTime()).toBe(monday.getTime());
  });

  it('maps the following Monday to the next week', () => {
    const monday = startOfLocalWeek(new Date(2026, 5, 24, 9, 30));
    const nextMonday = addLocalDays(monday, 7);

    expect(startOfLocalWeek(nextMonday).getTime()).toBe(nextMonday.getTime());
  });
});

describe('filterMatchesByWeek', () => {
  const anchor = new Date(2026, 5, 24, 9, 30);
  const monday = startOfLocalWeek(anchor);

  it('includes the week start and excludes the next week start', () => {
    const atWeekStart = createMatch(1, monday.toISOString());
    const atNextWeekStart = createMatch(2, addLocalDays(monday, 7).toISOString());

    expect(
      filterMatchesByWeek([atWeekStart, atNextWeekStart], anchor).map((match) => match.id),
    ).toEqual([1]);
  });

  it('includes a match late on the final Sunday of the week', () => {
    const sunday = addLocalDays(monday, 6);
    const sundayNight = new Date(sunday);
    sundayNight.setHours(23, 0, 0, 0);
    const match = createMatch(1, sundayNight.toISOString());

    expect(filterMatchesByWeek([match], anchor).map((m) => m.id)).toEqual([1]);
  });

  it('excludes matches with no kickoff and sorts the rest by kickoff', () => {
    const matches: Match[] = [
      createMatch(1, addLocalDays(monday, 3).toISOString()),
      { ...createMatch(2, monday.toISOString()), kickoff: null },
      createMatch(3, addLocalDays(monday, 1).toISOString()),
    ];

    expect(filterMatchesByWeek(matches, anchor).map((match) => match.id)).toEqual([3, 1]);
  });
});
