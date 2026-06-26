import type { Analytics, Dashboard, MatchDetail } from '../api/types';

export type HeroStats = {
  winRate: string;
  avgOdds: string;
  valueBets: string;
};

export function formatHeroWinRate(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function formatHeroAvgOdds(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return '—';
  }

  return value.toFixed(1);
}

export function formatHeroValueBetCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return String(value);
}

export function computeAverageOdds(matches: MatchDetail[]): number | null {
  const prices: number[] = [];

  for (const match of matches) {
    const odds = match.odds[0];
    if (!odds) {
      continue;
    }

    for (const price of [odds.home, odds.draw, odds.away]) {
      if (Number.isFinite(price) && price > 0) {
        prices.push(price);
      }
    }
  }

  if (prices.length === 0) {
    return null;
  }

  const total = prices.reduce((sum, price) => sum + price, 0);
  return total / prices.length;
}

export function buildHeroStats(
  dashboard: Dashboard,
  analytics: Analytics | null | undefined,
  matches: MatchDetail[],
): HeroStats {
  return {
    winRate: formatHeroWinRate(dashboard.model_accuracy),
    avgOdds: formatHeroAvgOdds(computeAverageOdds(matches)),
    valueBets: formatHeroValueBetCount(analytics?.total_value_bets),
  };
}
