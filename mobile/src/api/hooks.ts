import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type {
  MatchListParams,
  PredictionListParams,
  ValueBetListParams,
} from './types';

export function useDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.getDashboard(),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useMatches(
  params?: MatchListParams,
  options?: {
    enabled?: boolean;
    keepPreviousData?: boolean;
    refetchInterval?: number | false;
    staleTime?: number;
  },
) {
  return useQuery({
    queryKey: queryKeys.matches(params),
    queryFn: () => api.getMatches(params),
    enabled: options?.enabled ?? true,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime,
  });
}

/**
 * Paged variant of {@link useMatches}. Fetches matches in fixed-size pages so a
 * large list (e.g. the Completed tab) shows a first page quickly and the rest
 * can be loaded in the background. `params.limit` is the page size.
 */
export function useMatchesInfinite(
  params: MatchListParams = {},
  options?: {
    enabled?: boolean;
    keepPreviousData?: boolean;
    refetchInterval?: number | false;
  },
) {
  const pageSize = params.limit ?? 50;
  return useInfiniteQuery({
    queryKey: queryKeys.matchesInfinite(params),
    queryFn: ({ pageParam }) =>
      api.getMatches({ ...params, limit: pageSize, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // A short page means we've reached the end; otherwise the next offset is
      // the running total of rows fetched so far.
      if (lastPage.length < pageSize) {
        return undefined;
      }
      return allPages.reduce((total, page) => total + page.length, 0);
    },
    enabled: options?.enabled ?? true,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
    refetchInterval: options?.refetchInterval,
  });
}

export function useMatch(matchId: number) {
  return useQuery({
    queryKey: queryKeys.match(matchId),
    queryFn: () => api.getMatch(matchId),
    enabled: matchId > 0,
  });
}

export function usePredictions(params?: PredictionListParams) {
  return useQuery({
    queryKey: queryKeys.predictions(params),
    queryFn: () => api.getPredictions(params),
  });
}

export function useValueBets(
  params?: ValueBetListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.valueBets(params),
    queryFn: () => api.getValueBets(params),
    enabled: options?.enabled ?? true,
  });
}

export function useAnalytics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: () => api.getAnalytics(),
    enabled: options?.enabled ?? true,
  });
}
