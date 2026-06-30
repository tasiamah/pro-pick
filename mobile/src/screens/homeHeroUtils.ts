import type { Analytics, Dashboard, MatchDetail } from '../api/types';

export type HeroStats = {
  winRate: string;
  winRateCaption: string | null;
  avgOdds: string;
  valueBets: string;
};

export function formatHeroWinRate(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function formatHeroWinRateCaption(
  confidentAccuracy: number | null,
): string | null {
  if (confidentAccuracy == null || !Number.isFinite(confidentAccuracy)) {
    return null;
  }

  return 'Confident picks';
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
  const confidentAccuracy = dashboard.confident_accuracy;
  return {
    winRate: formatHeroWinRate(confidentAccuracy ?? dashboard.model_accuracy),
    winRateCaption: formatHeroWinRateCaption(confidentAccuracy),
    avgOdds: formatHeroAvgOdds(computeAverageOdds(matches)),
    valueBets: formatHeroValueBetCount(
      analytics?.total_value_bets ?? dashboard.top_value_bets?.length,
    ),
  };
}
