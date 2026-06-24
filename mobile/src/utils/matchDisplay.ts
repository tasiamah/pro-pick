import type { Team } from '../api/types';

export function formatMatchTeams(
  homeTeam: Team | null | undefined,
  awayTeam: Team | null | undefined,
): string {
  const home = homeTeam?.name?.trim() || 'Home';
  const away = awayTeam?.name?.trim() || 'Away';
  return `${home} vs ${away}`;
}

export function getTeamName(team: Team | null | undefined, fallback: string): string {
  return team?.name?.trim() || fallback;
}
