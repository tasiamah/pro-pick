import type { Match } from '../api/types';

export type FavoriteTeam = {
  id: number;
  name: string;
};

export type FavoriteCompetition = {
  name: string;
};

export function buildFavoriteTeamIds(teams: FavoriteTeam[]): Set<number> {
  return new Set(teams.map((team) => team.id));
}

export function buildFavoriteCompetitionNames(
  competitions: FavoriteCompetition[],
): Set<string> {
  return new Set(competitions.map((competition) => competition.name.toLowerCase()));
}

export function matchMatchesFavorites(
  match: Match,
  favoriteTeamIds: Set<number>,
  favoriteCompetitionNames: Set<string>,
): boolean {
  if (favoriteTeamIds.size === 0 && favoriteCompetitionNames.size === 0) {
    return false;
  }

  if (
    favoriteTeamIds.has(match.home_team.id) ||
    favoriteTeamIds.has(match.away_team.id)
  ) {
    return true;
  }

  if (match.competition_name) {
    return favoriteCompetitionNames.has(match.competition_name.toLowerCase());
  }

  return false;
}

export function filterMatchesByFavorites<T extends Match>(
  matches: T[],
  teams: FavoriteTeam[],
  competitions: FavoriteCompetition[],
): T[] {
  const favoriteTeamIds = buildFavoriteTeamIds(teams);
  const favoriteCompetitionNames = buildFavoriteCompetitionNames(competitions);

  return matches.filter((match) =>
    matchMatchesFavorites(match, favoriteTeamIds, favoriteCompetitionNames),
  );
}
