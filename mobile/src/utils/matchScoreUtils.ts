import type { Match } from '../api/types';

export function hasMatchScore(
  match: Pick<Match, 'home_goals' | 'away_goals'>,
): boolean {
  return match.home_goals != null && match.away_goals != null;
}

export function shouldShowMatchScore(
  match: Pick<Match, 'status' | 'home_goals' | 'away_goals'>,
): boolean {
  if (!hasMatchScore(match)) {
    return false;
  }

  const status = match.status.toLowerCase();
  return status === 'live' || status === 'finished';
}

export function isLiveMatch(match: Pick<Match, 'status'>): boolean {
  return match.status.toLowerCase() === 'live';
}

export function formatMatchScoreline(
  match: Pick<Match, 'home_goals' | 'away_goals'>,
): string {
  return `${match.home_goals}–${match.away_goals}`;
}
