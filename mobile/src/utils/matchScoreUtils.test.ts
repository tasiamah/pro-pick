import {
  formatMatchScoreline,
  hasMatchScore,
  isLiveMatch,
  shouldShowMatchScore,
} from './matchScoreUtils';

describe('matchScoreUtils', () => {
  it('detects when both goals are present', () => {
    expect(hasMatchScore({ home_goals: 2, away_goals: 1 })).toBe(true);
    expect(hasMatchScore({ home_goals: 0, away_goals: null })).toBe(false);
  });

  it('shows scores only for live and finished matches', () => {
    const scored = { home_goals: 1, away_goals: 0 };

    expect(shouldShowMatchScore({ ...scored, status: 'live' })).toBe(true);
    expect(shouldShowMatchScore({ ...scored, status: 'finished' })).toBe(true);
    expect(shouldShowMatchScore({ ...scored, status: 'scheduled' })).toBe(false);
  });

  it('formats a scoreline', () => {
    expect(formatMatchScoreline({ home_goals: 2, away_goals: 1 })).toBe('2–1');
  });

  it('detects live status', () => {
    expect(isLiveMatch({ status: 'live' })).toBe(true);
    expect(isLiveMatch({ status: 'scheduled' })).toBe(false);
  });
});
