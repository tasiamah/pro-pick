import type { MatchDetail, ValueBet } from '../api/types';
import { startOfLocalDay } from '../utils/matchDates';
import {
  filterUpcomingMatchesForDay,
  filterUpcomingValueBets,
  selectHomeMatches,
} from './homeMatchUtils';

function createMatch(id: number, kickoff: string): MatchDetail {
  return {
    id,
    kickoff,
    status: 'scheduled',
    home_team: { id: 1, name: 'Home', logo_url: null },
    away_team: { id: 2, name: 'Away', logo_url: null },
    competition_name: 'League',
    odds: [],
    prediction: null,
  };
}

function createValueBet(id: number, matchId: number): ValueBet {
  return {
    id,
    match_id: matchId,
    outcome: 'home',
    model_prob: 0.5,
    odd: 2.0,
    expected_value: 0.1,
    edge: 0.1,
    recommended_stake: 10,
    confidence: 0.5,
  };
}

describe('filterUpcomingMatchesForDay', () => {
  it('drops matches on the selected day that have already kicked off', () => {
    const selectedDate = startOfLocalDay(new Date(2026, 5, 24, 0, 0));
    const now = new Date(2026, 5, 24, 16, 0);
    const started = createMatch(1, new Date(2026, 5, 24, 15, 0).toISOString());
    const upcoming = createMatch(2, new Date(2026, 5, 24, 20, 0).toISOString());
    const otherDay = createMatch(3, new Date(2026, 5, 25, 18, 0).toISOString());

    const result = filterUpcomingMatchesForDay(
      [started, upcoming, otherDay],
      selectedDate,
      now,
    );

    expect(result.map((match) => match.id)).toEqual([2]);
  });

  it('keeps every match on a future day since none have kicked off', () => {
    const selectedDate = startOfLocalDay(new Date(2026, 5, 25, 0, 0));
    const now = new Date(2026, 5, 24, 16, 0);
    const early = createMatch(1, new Date(2026, 5, 25, 13, 0).toISOString());
    const late = createMatch(2, new Date(2026, 5, 25, 20, 0).toISOString());

    const result = filterUpcomingMatchesForDay([early, late], selectedDate, now);

    expect(result.map((match) => match.id)).toEqual([1, 2]);
  });
});

describe('selectHomeMatches', () => {
  const selectedToday = startOfLocalDay(new Date(2026, 5, 24, 0, 0));
  const now = new Date(2026, 5, 24, 16, 0);

  it('tops up to the target with the soonest upcoming matches from later days', () => {
    const startedToday = createMatch(1, new Date(2026, 5, 24, 15, 0).toISOString());
    const upcomingTodayA = createMatch(2, new Date(2026, 5, 24, 17, 0).toISOString());
    const upcomingTodayB = createMatch(3, new Date(2026, 5, 24, 20, 0).toISOString());
    const tomorrow = createMatch(4, new Date(2026, 5, 25, 13, 0).toISOString());
    const dayAfter = createMatch(5, new Date(2026, 5, 26, 18, 0).toISOString());

    const result = selectHomeMatches(
      [startedToday, upcomingTodayA, upcomingTodayB, tomorrow, dayAfter],
      selectedToday,
      now,
    );

    // Two upcoming today (started one dropped) + soonest later match.
    expect(result.map((match) => match.id)).toEqual([2, 3, 4]);
  });

  it('returns every match on a day that already meets the target without filling', () => {
    const a = createMatch(1, new Date(2026, 5, 24, 17, 0).toISOString());
    const b = createMatch(2, new Date(2026, 5, 24, 19, 0).toISOString());
    const c = createMatch(3, new Date(2026, 5, 24, 21, 0).toISOString());
    const d = createMatch(4, new Date(2026, 5, 24, 22, 0).toISOString());
    const tomorrow = createMatch(5, new Date(2026, 5, 25, 13, 0).toISOString());

    const result = selectHomeMatches([a, b, c, d, tomorrow], selectedToday, now);

    expect(result.map((match) => match.id)).toEqual([1, 2, 3, 4]);
  });

  it('returns only what is available when later days cannot fill the target', () => {
    const a = createMatch(1, new Date(2026, 5, 24, 17, 0).toISOString());
    const b = createMatch(2, new Date(2026, 5, 24, 20, 0).toISOString());

    const result = selectHomeMatches([a, b], selectedToday, now);

    expect(result.map((match) => match.id)).toEqual([1, 2]);
  });

  it('only borrows from days after the selected day', () => {
    const selectedTomorrow = startOfLocalDay(new Date(2026, 5, 25, 0, 0));
    const earlierToday = createMatch(1, new Date(2026, 5, 24, 20, 0).toISOString());
    const onSelectedDay = createMatch(2, new Date(2026, 5, 25, 18, 0).toISOString());
    const laterA = createMatch(3, new Date(2026, 5, 26, 13, 0).toISOString());
    const laterB = createMatch(4, new Date(2026, 5, 27, 14, 0).toISOString());

    const result = selectHomeMatches(
      [earlierToday, onSelectedDay, laterA, laterB],
      selectedTomorrow,
      now,
    );

    // The earlier (today) match is not borrowed; fills forward from later days.
    expect(result.map((match) => match.id)).toEqual([2, 3, 4]);
  });
});

describe('filterUpcomingValueBets', () => {
  it('hides bets whose match has kicked off and keeps the rest', () => {
    const now = new Date(2026, 5, 24, 16, 0);
    const matches = [
      createMatch(1, new Date(2026, 5, 24, 15, 0).toISOString()),
      createMatch(2, new Date(2026, 5, 24, 20, 0).toISOString()),
    ];
    const bets = [
      createValueBet(10, 1), // match kicked off -> hidden
      createValueBet(20, 2), // match upcoming -> kept
      createValueBet(30, 99), // match not loaded -> kept
    ];

    const result = filterUpcomingValueBets(bets, matches, now);

    expect(result.map((bet) => bet.id)).toEqual([20, 30]);
  });
});
