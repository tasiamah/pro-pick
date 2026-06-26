import { useCallback, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMatches } from '../api/hooks';
import {
  AsyncState,
  DatePickerRow,
  ErrorState,
  LoadingState,
  MatchCard,
} from '../components';
import { useMatchDateAnchor } from '../hooks/useMatchDateAnchor';
import type { MatchesStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { filterMatchesByDate } from '../utils/matchDates';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';

type Props = NativeStackScreenProps<MatchesStackParamList, 'Matches'>;

export function MatchesScreen({ navigation }: Props) {
  const {
    dateRange,
    matchListParams,
    selectedDate,
    setSelectedDate,
    dashboardQuery,
  } = useMatchDateAnchor();
  const matchesQuery = useMatches(matchListParams, {
    enabled: !dashboardQuery.isLoading,
  });

  const filteredMatches = useMemo(
    () => filterMatchesByDate(matchesQuery.data ?? [], selectedDate),
    [matchesQuery.data, selectedDate],
  );

  const onRefresh = useCallback(() => {
    void matchesQuery.refetch();
  }, [matchesQuery]);

  if (
    isInitialQueryLoad(dashboardQuery.isLoading, dashboardQuery.data) ||
    isInitialQueryLoad(matchesQuery.isLoading, matchesQuery.data)
  ) {
    return <LoadingState message="Loading matches…" />;
  }

  if (queryErrorForDisplay(matchesQuery.error, matchesQuery.data)) {
    return (
      <ErrorState message="Could not load matches" onRetry={onRefresh} />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={matchesQuery.isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <DatePickerRow
        dates={dateRange}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <AsyncState
        isLoading={false}
        error={null}
        isEmpty={filteredMatches.length === 0}
        emptyMessage="No matches on this day"
      >
        <View style={styles.cardList}>
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={match.prediction}
              odds={match.odds}
              onPress={() =>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  cardList: {
    gap: spacing.md,
  },
});
