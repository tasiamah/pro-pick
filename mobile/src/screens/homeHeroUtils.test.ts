import type { Analytics, Dashboard, MatchDetail } from '../api/types';

import {
  buildHeroStats,
  computeAverageOdds,
  countVerifiedPredictionsToday,
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
  prediction: null,
};

const dashboard: Dashboard = {
  matches_today: 2,
  upcoming_matches: 5,
  latest_kickoff: '2026-06-28T15:00:00Z',
  top_value_bets: [],
  model_accuracy: 0.513,
  roi: 0.12,
  confident_accuracy: 0.71,
  confident_coverage: 0.19,
  confidence_threshold: 0.7,
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

  it('pluralizes the predictions subtitle', () => {
    expect(formatPredictionsSubtitle(0)).toBe('0 verified predictions today');
    expect(formatPredictionsSubtitle(1)).toBe('1 verified prediction today');
    expect(formatPredictionsSubtitle(3)).toBe('3 verified predictions today');
  });

  it('counts only predicted matches kicking off on the local day', () => {
    const now = new Date('2026-06-28T12:00:00Z');
    const todayKickoff = now.toISOString();
    const otherDayKickoff = new Date(
      now.getTime() + 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const prediction = {
      match_id: 1,
      model_version: 'v1',
      prob_home: 0.5,
      prob_draw: 0.3,
      prob_away: 0.2,
    };
    const matches: MatchDetail[] = [
      { ...baseMatch, id: 1, kickoff: todayKickoff, prediction },
      { ...baseMatch, id: 2, kickoff: todayKickoff, prediction: null },
      { ...baseMatch, id: 3, kickoff: otherDayKickoff, prediction },
    ];

    expect(countVerifiedPredictionsToday(matches, now)).toBe(1);
  });

  it('builds hero stats from the high-confidence win rate', () => {
    expect(buildHeroStats(dashboard, analytics, [baseMatch])).toEqual({
      winRate: '71.0%',
      avgOdds: '3.0',
      valueBets: '3',
      subtitle: '0 verified predictions today',
    });
  });

  it('falls back to full-slate accuracy when no confident metric is available', () => {
    const withoutConfident: Dashboard = {
      ...dashboard,
      confident_accuracy: null,
      confident_coverage: null,
      confidence_threshold: null,
    };

    expect(buildHeroStats(withoutConfident, analytics, [baseMatch])).toEqual({
      winRate: '51.3%',
      avgOdds: '3.0',
      valueBets: '3',
      subtitle: '0 verified predictions today',
    });
  });
});
