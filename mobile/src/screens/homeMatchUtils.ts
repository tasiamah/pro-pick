import type { MatchDetail, ValueBet } from '../api/types';
import { filterMatchesByDate } from '../utils/matchDates';
import { hasKickedOff } from './matchesFilterUtils';

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

/**
 * Value bets whose match has not kicked off yet. ``ValueBet`` carries no
 * kickoff, so we resolve it from the loaded matches by ``match_id``; bets whose
 * match is unknown are kept rather than hidden, to avoid dropping picks we can't
 * place in time.
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
    return kickoff === undefined || !hasKickedOff(kickoff, now);
  });
}
