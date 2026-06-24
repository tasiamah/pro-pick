import type { ValueBet } from '../api/types';

export function parseMatchId(value: string): number | null {
  const id = Number.parseInt(value, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

export function filterValueBetsByMatchId(
  valueBets: ValueBet[],
  matchId: number,
): ValueBet[] {
  return valueBets.filter((valueBet) => valueBet.match_id === matchId);
}
