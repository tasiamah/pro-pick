import type { MatchDetail } from '../api/types';

export function resolveMatchesBrowseSource(
  apiMatches: MatchDetail[] | undefined,
  demoMatches: MatchDetail[],
): { matches: MatchDetail[]; isDemoFallback: boolean } {
  const apiData = apiMatches ?? [];

  if (apiData.length > 0) {
    return { matches: apiData, isDemoFallback: false };
  }

  return { matches: demoMatches, isDemoFallback: true };
}
