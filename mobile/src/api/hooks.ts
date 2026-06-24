import { useQuery } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type {
  MatchListParams,
  PredictionListParams,
  ValueBetListParams,
} from './types';

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.getDashboard(),
  });
}

export function useMatches(
  params?: MatchListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.matches(params),
    queryFn: () => api.getMatches(params),
    enabled: options?.enabled ?? true,
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

export function useAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: () => api.getAnalytics(),
  });
}
