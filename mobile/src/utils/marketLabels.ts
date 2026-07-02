import type { MarketPick } from '../api/types';

export const SECONDARY_MARKET_IDS = [
  'btts',
  'over_under_25',
  'double_chance',
] as const;

export type SecondaryMarketId = (typeof SECONDARY_MARKET_IDS)[number];

export type MarketId = '1x2' | SecondaryMarketId;

export function isSecondaryMarketId(value: string): value is SecondaryMarketId {
  return (SECONDARY_MARKET_IDS as readonly string[]).includes(value);
}

export function formatMarketPickLabel(
  pick: MarketPick,
  homeTeamName: string,
  awayTeamName: string,
): string {
  const outcome = pick.recommended_outcome.toLowerCase();

  if (pick.market === 'btts') {
    return outcome === 'yes' ? 'BTTS Yes' : 'BTTS No';
  }

  if (pick.market === 'over_under_25') {
    return outcome === 'over' ? 'Over 2.5' : 'Under 2.5';
  }

  if (pick.market === 'double_chance') {
    if (outcome === '1x') {
      return `${homeTeamName} or Draw`;
    }
    if (outcome === '12') {
      return `${homeTeamName} or ${awayTeamName}`;
    }
    if (outcome === 'x2') {
      return `Draw or ${awayTeamName}`;
    }
  }

  return pick.recommended_outcome;
}

export function formatMarketSectionTitle(market: SecondaryMarketId): string {
  if (market === 'btts') {
    return 'Both Teams to Score';
  }
  if (market === 'over_under_25') {
    return 'Over / Under 2.5';
  }
  return 'Double Chance';
}
