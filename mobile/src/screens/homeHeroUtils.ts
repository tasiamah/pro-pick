import type { Dashboard, MatchDetail } from '../api/types';
import {
  getOddForOutcome,
  getRecommendedOutcome,
} from '../components/matchCard/matchCardUtils';

export type HeroStats = {
  winRate: string;
  avgOdds: string;
  valueBets: string;
  subtitle: string;
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

export function formatPredictionsSubtitle(count: number): string {
  return `${count} upcoming prediction${count === 1 ? '' : 's'}`;
}

export function computeAveragePickOdds(matches: MatchDetail[]): number | null {
  const prices: number[] = [];

  for (const match of matches) {
    const odds = match.odds[0];
    if (!odds || !match.prediction) {
      continue;
    }

    const price = getOddForOutcome(odds, getRecommendedOutcome(match.prediction));
    if (Number.isFinite(price) && price > 0) {
      prices.push(price);
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
  matches: MatchDetail[],
  shownPredictionCount = 0,
): HeroStats {
  const confidentAccuracy = dashboard.confident_accuracy;
  return {
    winRate: formatHeroWinRate(confidentAccuracy ?? dashboard.model_accuracy),
    avgOdds: formatHeroAvgOdds(computeAveragePickOdds(matches)),
    valueBets: formatHeroValueBetCount(dashboard.upcoming_value_bets),
    subtitle: formatPredictionsSubtitle(shownPredictionCount),
  };
}
