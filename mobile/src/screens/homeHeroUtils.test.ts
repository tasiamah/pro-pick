import type { Dashboard, MatchDetail, ValueBet } from '../api/types';

import {
  buildHeroStats,
  computeAveragePickOdds,
  formatHeroAvgOdds,
  formatHeroValueBetCount,
  formatHeroWinRate,
  formatPredictionsSubtitle,
} from './homeHeroUtils';

const baseMatch: MatchDetail = {
  id: 1,
  kickoff: '2026-06-28T15:00:00Z',
  status: 'scheduled',
  home_team: { id: 1, name: 'Home', logo_url: null },
  away_team: { id: 2, name: 'Away', logo_url: null },
  competition_name: 'Premier League',
  odds: [{ bookmaker: 'Bet365', home: 2, draw: 3, away: 4 }],
  prediction: {
    match_id: 1,
    model_version: 'v1',
    prob_home: 0.5,
    prob_draw: 0.3,
    prob_away: 0.2,
  },
};

const valueBet: ValueBet = {
  id: 1,
  match_id: 1,
  outcome: 'home',
  model_prob: 0.5,
  odd: 2,
  expected_value: 0.05,
  edge: 0.04,
  recommended_stake: 0.02,
  confidence: 0.2,
};

const dashboard: Dashboard = {
  matches_today: 2,
  upcoming_matches: 5,
  latest_kickoff: '2026-06-28T15:00:00Z',
  top_value_bets: [valueBet, valueBet, valueBet],
  model_accuracy: 0.513,
  roi: 0.12,
  confident_accuracy: 0.71,
  confident_coverage: 0.19,
  confidence_threshold: 0.7,
};

describe('homeHeroUtils', () => {
  it('formats hero stat values', () => {
    expect(formatHeroWinRate(0.873)).toBe('87.3%');
    expect(formatHeroWinRate(null)).toBe('—');
    expect(formatHeroAvgOdds(2.44)).toBe('2.4');
    expect(formatHeroAvgOdds(null)).toBe('—');
    expect(formatHeroValueBetCount(3)).toBe('3');
    expect(formatHeroValueBetCount(undefined)).toBe('—');
  });

  it('averages the recommended pick odd across predicted matches', () => {
    expect(computeAveragePickOdds([])).toBeNull();
    expect(computeAveragePickOdds([baseMatch])).toBe(2);
    expect(computeAveragePickOdds([{ ...baseMatch, odds: [] }])).toBeNull();
    expect(computeAveragePickOdds([{ ...baseMatch, prediction: null }])).toBeNull();
  });

  it('pluralizes the predictions subtitle', () => {
    expect(formatPredictionsSubtitle(0)).toBe('0 upcoming predictions');
    expect(formatPredictionsSubtitle(1)).toBe('1 upcoming prediction');
    expect(formatPredictionsSubtitle(3)).toBe('3 upcoming predictions');
  });

  it('builds hero stats from the high-confidence win rate', () => {
    expect(buildHeroStats(dashboard, [baseMatch], 12)).toEqual({
      winRate: '71.0%',
      avgOdds: '2.0',
      valueBets: '3',
      subtitle: '12 upcoming predictions',
    });
  });

  it('falls back to full-slate accuracy when no confident metric is available', () => {
    const withoutConfident: Dashboard = {
      ...dashboard,
      confident_accuracy: null,
      confident_coverage: null,
      confidence_threshold: null,
    };

    expect(buildHeroStats(withoutConfident, [baseMatch])).toEqual({
      winRate: '51.3%',
      avgOdds: '2.0',
      valueBets: '3',
      subtitle: '0 upcoming predictions',
    });
  });
});
