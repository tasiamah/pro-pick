import type {
  MatchListParams,
  PredictionListParams,
  ValueBetListParams,
} from './types';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  matches: (params: MatchListParams = {}) =>
    [
      'matches',
      params.limit ?? null,
      params.offset ?? null,
      params.kickoff_from ?? null,
      params.kickoff_to ?? null,
      params.status ?? null,
      params.odds_tier ?? null,
      params.q ?? null,
    ] as const,
  matchesInfinite: (params: MatchListParams = {}) =>
    [
      'matches-infinite',
      params.limit ?? null,
      params.kickoff_from ?? null,
      params.kickoff_to ?? null,
      params.status ?? null,
      params.odds_tier ?? null,
      params.q ?? null,
    ] as const,
  match: (matchId: number) => ['matches', matchId] as const,
  predictions: (params: PredictionListParams = {}) =>
    ['predictions', params.limit ?? null, params.match_id ?? null] as const,
  valueBets: (params: ValueBetListParams = {}) =>
    ['value-bets', params.limit ?? null, params.match_id ?? null] as const,
  analytics: ['analytics'] as const,
};
