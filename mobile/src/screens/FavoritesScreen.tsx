import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMatches } from '../api/hooks';
import {
  AsyncState,
  DatePickerRow,
  EmptyState,
  ErrorState,
  FavoriteToggle,
  LoadingState,
  MatchCardV2,
} from '../components';
import type { FavoritesStackParamList } from '../navigation/types';
import { filterMatchesByFavorites, useFavoritesStore } from '../store';
import { colors, screenStyles, spacing, typography } from '../theme';
import {
  buildDateRange,
  buildDateWindowParams,
  DATE_RANGE_DAYS,
  filterMatchesByDate,
  startOfUtcDay,
} from '../utils/matchDates';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';

type Props = NativeStackScreenProps<FavoritesStackParamList, 'Favorites'>;

function SavedFavoritesRow() {
  const teams = useFavoritesStore((state) => state.teams);
  const competitions = useFavoritesStore((state) => state.competitions);
  const removeTeam = useFavoritesStore((state) => state.removeTeam);
  const removeCompetition = useFavoritesStore((state) => state.removeCompetition);

  if (teams.length === 0 && competitions.length === 0) {
    return null;
  }

  return (
    <View style={styles.savedSection}>
      <Text style={styles.savedTitle}>Saved favorites</Text>
      <ScrollView
        horizontal
        contentContainerStyle={styles.savedRow}
        showsHorizontalScrollIndicator={false}
      >
        {teams.map((team) => (
          <FavoriteToggle
            key={`team-${team.id}`}
            label={team.name}
            active
            onToggle={() => removeTeam(team.id)}
          />
        ))}
        {competitions.map((competition) => (
          <FavoriteToggle
            key={`competition-${competition.name}`}
            label={competition.name}
            active
            onToggle={() => removeCompetition(competition.name)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export function FavoritesScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState(() => startOfUtcDay());
  const teams = useFavoritesStore((state) => state.teams);
  const competitions = useFavoritesStore((state) => state.competitions);
  const hasFavorites = teams.length > 0 || competitions.length > 0;
  const matchListParams = useMemo(() => buildDateWindowParams(), []);
  const matchesQuery = useMatches(matchListParams, { enabled: hasFavorites });

  const dateRange = useMemo(() => buildDateRange(startOfUtcDay(), DATE_RANGE_DAYS), []);

  const filteredMatches = useMemo(() => {
    const favoriteMatches = filterMatchesByFavorites(
      matchesQuery.data ?? [],
      teams,
      competitions,
    );
    return filterMatchesByDate(favoriteMatches, selectedDate);
  }, [matchesQuery.data, teams, competitions, selectedDate]);

  const onRefresh = useCallback(() => {
    void matchesQuery.refetch();
  }, [matchesQuery]);

  if (!hasFavorites) {
    return (
      <View style={screenStyles.screenContainer}>
        <EmptyState message="Favorite teams or competitions from a match to see them here." />
      </View>
    );
  }

  if (isInitialQueryLoad(matchesQuery.isLoading, matchesQuery.data)) {
    return <LoadingState message="Loading favorites…" />;
  }

  if (queryErrorForDisplay(matchesQuery.error, matchesQuery.data)) {
    return <ErrorState message="Could not load favorite matches" onRetry={onRefresh} />;
  }

  return (
    <ScrollView
      style={screenStyles.screenContainer}
      contentContainerStyle={screenStyles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={matchesQuery.isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <SavedFavoritesRow />

      <DatePickerRow
        dates={dateRange}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <AsyncState
        isLoading={false}
        error={null}
        isEmpty={filteredMatches.length === 0}
        emptyMessage="No favorite matches on this day"
      >
        <View style={screenStyles.cardList}>
          {filteredMatches.map((match) => (
            <MatchCardV2
              key={match.id}
              match={match}
              odds={match.odds}
              prediction={match.prediction}
              onDetailsPress={() =>
                navigation.navigate('MatchDetail', { matchId: String(match.id) })
              }
            />
          ))}
        </View>
      </AsyncState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  savedSection: {
    gap: spacing.sm,
  },
  savedTitle: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  savedRow: {
    gap: spacing.sm,
  },
});
