import { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueries } from '@tanstack/react-query';

import { api } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import type { MatchDetail } from '../api/types';
import { EmptyState, ErrorState, LoadingState, MatchCardV2 } from '../components';
import type { FavoritesStackParamList } from '../navigation/types';
import { useFavoritesStore } from '../store';
import { colors, screenStyles } from '../theme';
import { sortMatchesByKickoff } from './favoritesUtils';

type Props = NativeStackScreenProps<FavoritesStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const matchIds = useFavoritesStore((state) => state.matchIds);

  const favoriteQueries = useQueries({
    queries: matchIds.map((matchId) => ({
      queryKey: queryKeys.match(matchId),
      queryFn: () => api.getMatch(matchId),
    })),
  });

  const onRefresh = useCallback(() => {
    favoriteQueries.forEach((query) => {
      void query.refetch();
    });
  }, [favoriteQueries]);

  if (matchIds.length === 0) {
    return (
      <View style={screenStyles.screenContainer}>
        <EmptyState message="No favorites yet. Tap the star on any match to add it here." />
      </View>
    );
  }

  const matches = sortMatchesByKickoff(
    favoriteQueries
      .map((query) => query.data)
      .filter((match): match is MatchDetail => match != null),
  );

  if (matches.length === 0 && favoriteQueries.some((query) => query.isLoading)) {
    return <LoadingState message="Loading favorites…" />;
  }

  if (matches.length === 0 && favoriteQueries.every((query) => query.isError)) {
    return <ErrorState message="Could not load favorite matches" onRetry={onRefresh} />;
  }

  const isRefetching = favoriteQueries.some((query) => query.isRefetching);

  return (
    <ScrollView
      style={screenStyles.screenContainer}
      contentContainerStyle={screenStyles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={screenStyles.cardList}>
        {matches.map((match) => (
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
    </ScrollView>
  );
}
