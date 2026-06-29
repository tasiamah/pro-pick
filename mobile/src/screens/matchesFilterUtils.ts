import type { MatchDetail } from '../api/types';
import {
  classifyOddsTier,
  type OddsTier,
} from '../components/demo/demoUtils';
import {
  getOddForOutcome,
  getRecommendedOutcome,
} from '../components/matchCard/matchCardUtils';

export type MatchStatusFilter = 'upcoming' | 'live' | 'completed';

export type MatchOddsTierFilter = 'all' | OddsTier;

const STATUS_FILTERS: Record<MatchStatusFilter, Set<string>> = {
  upcoming: new Set(['scheduled']),
  live: new Set(['live']),
  completed: new Set(['finished']),
};

function hasKickedOff(kickoff: string | null, now: Date): boolean {
  if (!kickoff) {
    return false;
  }

  const kickoffTime = new Date(kickoff).getTime();
  if (Number.isNaN(kickoffTime)) {
    return false;
  }

  return kickoffTime < now.getTime();
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
      const leftTime = left.kickoff ? new Date(left.kickoff).getTime() : null;
      const rightTime = right.kickoff ? new Date(right.kickoff).getTime() : null;
      if (leftTime === null && rightTime === null) {
        return 0;
      }
      if (leftTime === null) {
        return 1;
      }
      if (rightTime === null) {
        return -1;
      }
      return rightTime - leftTime;
    });
}

export function getMatchesEmptyMessage(
  statusFilter: MatchStatusFilter,
  oddsTierFilter: MatchOddsTierFilter,
  searchQuery: string,
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
    return 'No completed matches in this list.';
  }

  return 'No upcoming matches in this list.';
}
