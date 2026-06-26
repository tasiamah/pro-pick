import type { Analytics, Dashboard, MatchDetail } from '../api/types';

import {
  buildHeroStats,
  computeAverageOdds,
  formatHeroAvgOdds,
  formatHeroValueBetCount,
  formatHeroWinRate,
} from './homeHeroUtils';

const baseMatch: MatchDetail = {
  id: 1,
  kickoff: '2026-06-28T15:00:00Z',
  status: 'scheduled',
  home_team: { id: 1, name: 'Home', logo_url: null },
  away_team: { id: 2, name: 'Away', logo_url: null },
  competition_name: 'Premier League',
  odds: [{ bookmaker: 'Bet365', home: 2, draw: 3, away: 4 }],
  prediction: null,
};

const dashboard: Dashboard = {
  matches_today: 2,
  upcoming_matches: 5,
  latest_kickoff: '2026-06-28T15:00:00Z',
  top_value_bets: [],
  model_accuracy: 0.873,
  roi: 0.12,
};

const analytics: Analytics = {
  accuracy: 0.873,
  log_loss: 0.9,
  roi: 0.12,
  total_value_bets: 3,
  settled_value_bets: 1,
  roi_trend: [],
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

  it('computes average odds across loaded matches', () => {
    expect(computeAverageOdds([])).toBeNull();
    expect(computeAverageOdds([baseMatch])).toBe(3);
    expect(computeAverageOdds([{ ...baseMatch, odds: [] }])).toBeNull();
  });

  it('builds hero stats from dashboard, analytics, and matches', () => {
    expect(buildHeroStats(dashboard, analytics, [baseMatch])).toEqual({
      winRate: '87.3%',
      avgOdds: '3.0',
      valueBets: '3',
    });
  });
});
