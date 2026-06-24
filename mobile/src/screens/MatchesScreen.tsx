import { useCallback, useMemo, useState } from 'react';
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
import type { MatchesStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import {
  buildDateRange,
  buildDateWindowParams,
  DATE_RANGE_DAYS,
  filterMatchesByDate,
  startOfUtcDay,
} from '../utils/matchDates';

type Props = NativeStackScreenProps<MatchesStackParamList, 'Matches'>;

export function MatchesScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState(() => startOfUtcDay());
  const matchListParams = useMemo(() => buildDateWindowParams(), []);
  const matchesQuery = useMatches(matchListParams);

  const dateRange = useMemo(() => buildDateRange(startOfUtcDay(), DATE_RANGE_DAYS), []);

  const filteredMatches = useMemo(
    () => filterMatchesByDate(matchesQuery.data ?? [], selectedDate),
    [matchesQuery.data, selectedDate],
  );

  const onRefresh = useCallback(() => {
    void matchesQuery.refetch();
  }, [matchesQuery]);

  if (matchesQuery.isLoading && !matchesQuery.data) {
    return <LoadingState message="Loading matches…" />;
  }

  if (matchesQuery.error && !matchesQuery.data) {
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
