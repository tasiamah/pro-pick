import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMatches } from '../api/hooks';
import {
  AsyncState,
  ErrorState,
  FilterChipRow,
  LoadingState,
  MatchCardV2,
  SearchInput,
  SegmentedControl,
} from '../components';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { MatchesStackParamList } from '../navigation/types';
import { colors, screenStyles, spacing } from '../theme';
import { addUtcDays, buildDateWindowParams, startOfUtcDay } from '../utils/matchDates';
import { isInitialQueryLoad, queryErrorForDisplay } from '../utils/queryState';
import { MATCHES_DEMO_DATA } from './matchesDemoData';
import {
  filterMatchesForBrowse,
  getMatchesEmptyMessage,
  type MatchOddsTierFilter,
  type MatchStatusFilter,
} from './matchesFilterUtils';
import { resolveMatchesBrowseSource } from './matchesScreenUtils';

type Props = NativeStackScreenProps<MatchesStackParamList, 'Matches'>;

const SEARCH_DEBOUNCE_MS = 300;
const BROWSE_WINDOW_DAYS = 30;

export function MatchesScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('upcoming');
  const [oddsTierFilter, setOddsTierFilter] = useState<MatchOddsTierFilter>('all');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const matchListParams = useMemo(() => {
    const start = addUtcDays(startOfUtcDay(), -BROWSE_WINDOW_DAYS);
    const end = addUtcDays(startOfUtcDay(), BROWSE_WINDOW_DAYS);
    return buildDateWindowParams(start, end);
  }, []);

  const matchesQuery = useMatches(matchListParams);
  const browseSource = useMemo(
    () => resolveMatchesBrowseSource(matchesQuery.data, MATCHES_DEMO_DATA),
    [matchesQuery.data],
  );
  const filteredMatches = useMemo(
    () =>
      filterMatchesForBrowse(
        browseSource.matches,
        statusFilter,
        oddsTierFilter,
        debouncedSearchQuery,
      ),
    [browseSource.matches, debouncedSearchQuery, oddsTierFilter, statusFilter],
  );

  const emptyMessage = useMemo(
    () => getMatchesEmptyMessage(statusFilter, oddsTierFilter, debouncedSearchQuery),
    [debouncedSearchQuery, oddsTierFilter, statusFilter],
  );

  const onRefresh = useCallback(() => {
    void matchesQuery.refetch();
  }, [matchesQuery]);

  if (isInitialQueryLoad(matchesQuery.isLoading, matchesQuery.data)) {
    return <LoadingState message="Loading matches…" />;
  }

  if (queryErrorForDisplay(matchesQuery.error, matchesQuery.data)) {
    return (
      <ErrorState message="Could not load matches" onRetry={onRefresh} />
    );
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
      <View style={styles.filters}>
        <SearchInput onChangeText={setSearchQuery} value={searchQuery} />
        <SegmentedControl
          onChange={setStatusFilter}
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'live', label: 'Live' },
            { value: 'completed', label: 'Completed' },
          ]}
          value={statusFilter}
        />
        <FilterChipRow
          onChange={setOddsTierFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          value={oddsTierFilter}
        />
      </View>

      <AsyncState
        isLoading={false}
        error={null}
        isEmpty={filteredMatches.length === 0}
        emptyMessage={emptyMessage}
      >
        <View style={styles.cardGrid}>
          {filteredMatches.map((match) => (
            <View key={match.id} style={styles.cardGridItem}>
              <MatchCardV2
                match={match}
                odds={match.odds}
                prediction={match.prediction}
                onDetailsPress={() => {
                  navigation.navigate('MatchDetail', { matchId: String(match.id) });
                }}
              />
            </View>
          ))}
        </View>
      </AsyncState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: spacing.md,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardGridItem: {
    marginBottom: spacing.md,
    width: '48%',
  },
});
