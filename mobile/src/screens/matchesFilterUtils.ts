import type { MatchDetail } from '../api/types';
import {
  classifyOddsTier,
  type OddsTier,
} from '../components/demo/demoUtils';
import {
  getOddForOutcome,
  getRecommendedOutcome,
} from '../components/matchCard/matchCardUtils';
import { filterHighConfidenceMatches } from '../utils/marketPicks';
import { parseMatchDate } from '../utils/matchDates';

export type MatchStatusFilter = 'upcoming' | 'live' | 'completed';

export type MatchOddsTierFilter = 'all' | OddsTier;

const STATUS_FILTERS: Record<MatchStatusFilter, Set<string>> = {
  upcoming: new Set(['scheduled']),
  live: new Set(['live']),
  completed: new Set(['finished']),
};

export function hasKickedOff(kickoff: string | null, now: Date): boolean {
  if (!kickoff) {
    return false;
  }

  const kickoffTime = parseMatchDate(kickoff).getTime();
  if (Number.isNaN(kickoffTime)) {
    return false;
  }

  return kickoffTime <= now.getTime();
}

export function matchesStatusFilter(
  match: MatchDetail,
  statusFilter: MatchStatusFilter,
  now: Date = new Date(),
): boolean {
  if (!STATUS_FILTERS[statusFilter].has(match.status.toLowerCase())) {
    return false;
  }

  if (statusFilter === 'upcoming') {
    return !hasKickedOff(match.kickoff, now);
  }

  return true;
}

export function matchesSearchFilter(match: MatchDetail, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const homeName = match.home_team.name.toLowerCase();
  const awayName = match.away_team.name.toLowerCase();
  const competitionName = match.competition_name?.toLowerCase() ?? '';

  return (
    homeName.includes(normalizedQuery) ||
    awayName.includes(normalizedQuery) ||
    competitionName.includes(normalizedQuery)
  );
}

export function matchesOddsTierFilter(
  match: MatchDetail,
  oddsTierFilter: MatchOddsTierFilter,
): boolean {
  if (oddsTierFilter === 'all') {
    return true;
  }

  const primaryOdds = match.odds[0];
  const prediction = match.prediction;
  if (!primaryOdds || !prediction) {
    return false;
  }

  const tier = classifyOddsTier(
    getOddForOutcome(primaryOdds, getRecommendedOutcome(prediction)),
  );
  return tier === oddsTierFilter;
}

export function filterMatchesForBrowse(
  matches: MatchDetail[],
  statusFilter: MatchStatusFilter,
  oddsTierFilter: MatchOddsTierFilter,
  searchQuery: string,
  now: Date = new Date(),
): MatchDetail[] {
  return matches
    .filter(
      (match) =>
        matchesStatusFilter(match, statusFilter, now) &&
        matchesSearchFilter(match, searchQuery) &&
        matchesOddsTierFilter(match, oddsTierFilter),
    )
    .sort((left, right) => {
      const leftTime = left.kickoff ? parseMatchDate(left.kickoff).getTime() : null;
      const rightTime = right.kickoff
        ? parseMatchDate(right.kickoff).getTime()
        : null;
      if (leftTime === null && rightTime === null) {
        return 0;
      }
      if (leftTime === null) {
        return 1;
      }
      if (rightTime === null) {
        return -1;
      }
      return statusFilter === 'completed'
        ? rightTime - leftTime
        : leftTime - rightTime;
    });
}

export function selectMatchesForDisplay(
  filteredMatches: MatchDetail[],
  statusFilter: MatchStatusFilter,
): MatchDetail[] {
  // Upcoming and completed both show only matches the model made a confident
  // pick on; live shows every in-play fixture.
  if (statusFilter === 'upcoming' || statusFilter === 'completed') {
    return filterHighConfidenceMatches(filteredMatches);
  }

  return filteredMatches;
}

export function getMatchesEmptyMessage(
  statusFilter: MatchStatusFilter,
  oddsTierFilter: MatchOddsTierFilter,
  searchQuery: string,
  highConfidenceOnly = false,
): string {
  if (searchQuery.trim()) {
    return 'No matches match your search.';
  }

  if (oddsTierFilter !== 'all') {
    return `No ${oddsTierFilter} odds matches in this list.`;
  }

  if (statusFilter === 'live') {
    return 'No live matches right now.';
  }

  if (statusFilter === 'completed') {
    return highConfidenceOnly
      ? 'No confident picks right now'
      : 'No completed matches in this list.';
  }

  if (highConfidenceOnly) {
    return 'No confident picks right now';
  }

  return 'No upcoming matches in this list.';
}

export type ConfidentPicksEmptyContext =
  | 'home_week'
  | 'home_day'
  | 'matches_upcoming'
  | 'matches_completed';

export type ConfidentPicksEmptyState = {
  title: string;
  subtext: string;
};

const MAX_COMPETITIONS_IN_EMPTY_STATE = 2;

function periodLabel(context: ConfidentPicksEmptyContext): string {
  switch (context) {
    case 'home_week':
      return 'this week';
    case 'home_day':
      return 'today';
    case 'matches_upcoming':
      return 'right now';
    case 'matches_completed':
      return 'in this period';
  }
}

function fixtureAvailabilitySentence(
  context: ConfidentPicksEmptyContext,
  competitionClause: string,
): string {
  if (competitionClause) {
    switch (context) {
      case 'home_week':
        return `Fixtures${competitionClause} are on this week.`;
      case 'home_day':
        return `Fixtures${competitionClause} are on today.`;
      case 'matches_upcoming':
        return `Fixtures${competitionClause} are upcoming.`;
      case 'matches_completed':
        return `Fixtures${competitionClause} were played recently.`;
    }
  }

  switch (context) {
    case 'home_week':
      return 'Fixtures are on this week.';
    case 'home_day':
      return 'Fixtures are on today.';
    case 'matches_upcoming':
      return 'Fixtures are upcoming.';
    case 'matches_completed':
      return 'Fixtures were played recently.';
  }
}

const NO_CONFIDENT_PICKS_SENTENCE = 'No confident picks for now.';
const QUIET_WEEKS_SENTENCE = 'Off-season weeks are often like this.';

export function uniqueCompetitionNames(matches: MatchDetail[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const match of matches) {
    const name = match.competition_name?.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }

  return names;
}

export function formatCompetitionClause(names: string[]): string {
  if (names.length === 0) {
    return '';
  }

  const displayed = names.slice(0, MAX_COMPETITIONS_IN_EMPTY_STATE);

  if (displayed.length === 1) {
    return ` in ${displayed[0]}`;
  }

  if (names.length === 2) {
    return ` across ${displayed[0]} and ${displayed[1]}`;
  }

  return ` across ${displayed[0]}, ${displayed[1]} and others`;
}

function formatMatchAvailability(
  matches: MatchDetail[],
  context: ConfidentPicksEmptyContext,
): string {
  const count = matches.length;
  const period = periodLabel(context);

  if (count === 0) {
    return `No fixtures ${period}. ${QUIET_WEEKS_SENTENCE}`;
  }

  const competitionClause = formatCompetitionClause(uniqueCompetitionNames(matches));

  return (
    `${fixtureAvailabilitySentence(context, competitionClause)} ` +
    `${NO_CONFIDENT_PICKS_SENTENCE} ` +
    QUIET_WEEKS_SENTENCE
  );
}

/** Copy when the list is empty because nothing cleared the confidence bar. */
export function getNoConfidentPicksEmptyState(
  availableMatches: MatchDetail[],
  context: ConfidentPicksEmptyContext,
): ConfidentPicksEmptyState {
  return {
    title: 'No confident picks right now',
    subtext: formatMatchAvailability(availableMatches, context),
  };
}
