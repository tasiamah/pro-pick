import type { MatchDetail, ValueBet } from '../api/types';
import {
  addLocalDays,
  filterMatchesByDate,
  parseMatchDate,
  startOfLocalDay,
} from '../utils/matchDates';
import { hasKickedOff } from './matchesFilterUtils';

/** Minimum number of matches the Home tab tries to show. */
export const HOME_MATCH_TARGET = 3;

/**
 * Matches on the selected local day that have not kicked off yet. The Home tab
 * is an "upcoming" view, so a match whose kickoff is in the past (e.g. one that
 * already started today) should drop off even though it still falls on the
 * selected calendar day.
 */
export function filterUpcomingMatchesForDay(
  matches: MatchDetail[],
  selectedDate: Date,
  now: Date,
): MatchDetail[] {
  return filterMatchesByDate(matches, selectedDate).filter(
    (match) => !hasKickedOff(match.kickoff, now),
  );
}

function kickoffTime(match: MatchDetail): number {
  return match.kickoff ? parseMatchDate(match.kickoff).getTime() : 0;
}

/**
 * Matches to show on the Home tab: the selected day's upcoming matches, topped
 * up with the soonest upcoming matches from later days so the list never shrinks
 * below ``target`` while the loaded window still has upcoming fixtures. Days that
 * already have ``target`` or more upcoming matches are returned unchanged.
 */
export function selectHomeMatches(
  matches: MatchDetail[],
  selectedDate: Date,
  now: Date,
  target = HOME_MATCH_TARGET,
): MatchDetail[] {
  const dayMatches = filterUpcomingMatchesForDay(matches, selectedDate, now);
  if (dayMatches.length >= target) {
    return dayMatches;
  }

  const nextDayStart = addLocalDays(startOfLocalDay(selectedDate), 1).getTime();
  const alreadyShown = new Set(dayMatches.map((match) => match.id));
  const fillers = matches
    .filter(
      (match) =>
        !alreadyShown.has(match.id) &&
        match.kickoff !== null &&
        !hasKickedOff(match.kickoff, now) &&
        kickoffTime(match) >= nextDayStart,
    )
    .sort((left, right) => kickoffTime(left) - kickoffTime(right))
    .slice(0, target - dayMatches.length);

  return [...dayMatches, ...fillers];
}

/**
 * Value bets whose match is loaded and has not kicked off yet. ``ValueBet``
 * carries no kickoff, so we resolve it from the loaded matches by ``match_id``.
 * A bet is only shown when its match is present in ``matches`` and still
 * upcoming; bets whose match is unknown (not yet loaded or outside the window)
 * are hidden so an already-started pick can't leak onto Home. Callers should
 * therefore pass the matches only once they have loaded.
 */
export function filterUpcomingValueBets(
  valueBets: ValueBet[],
  matches: MatchDetail[],
  now: Date,
): ValueBet[] {
  const kickoffByMatchId = new Map(
    matches.map((match) => [match.id, match.kickoff]),
  );
  return valueBets.filter((bet) => {
    const kickoff = kickoffByMatchId.get(bet.match_id);
    return kickoff !== undefined && !hasKickedOff(kickoff, now);
  });
}
