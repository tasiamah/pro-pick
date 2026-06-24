import { StyleSheet, View } from 'react-native';

import type { Match } from '../api/types';
import {
  buildFavoriteCompetitionNames,
  buildFavoriteTeamIds,
  useFavoritesStore,
} from '../store';
import { spacing } from '../theme';
import { getTeamName } from '../utils/matchDisplay';
import { FavoriteToggle } from './FavoriteToggle';

type MatchFavoriteActionsProps = {
  match: Match;
};

export function MatchFavoriteActions({ match }: MatchFavoriteActionsProps) {
  const teams = useFavoritesStore((state) => state.teams);
  const competitions = useFavoritesStore((state) => state.competitions);
  const toggleTeam = useFavoritesStore((state) => state.toggleTeam);
  const toggleCompetition = useFavoritesStore((state) => state.toggleCompetition);

  const favoriteTeamIds = buildFavoriteTeamIds(teams);
  const favoriteCompetitionNames = buildFavoriteCompetitionNames(competitions);
  const competitionName = match.competition_name;

  return (
    <View style={styles.row}>
      {match.home_team?.id != null ? (
        <FavoriteToggle
          label={getTeamName(match.home_team, 'Home')}
          active={favoriteTeamIds.has(match.home_team.id)}
          onToggle={() => toggleTeam(match.home_team)}
        />
      ) : null}
      {match.away_team?.id != null ? (
        <FavoriteToggle
          label={getTeamName(match.away_team, 'Away')}
          active={favoriteTeamIds.has(match.away_team.id)}
          onToggle={() => toggleTeam(match.away_team)}
        />
      ) : null}
      {competitionName ? (
        <FavoriteToggle
          label={competitionName}
          active={favoriteCompetitionNames.has(competitionName.toLowerCase())}
          onToggle={() => toggleCompetition({ name: competitionName })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
