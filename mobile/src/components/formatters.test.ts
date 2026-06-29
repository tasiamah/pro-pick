import {
  formatKickoff,
  formatOdd,
  formatOutcome,
  formatPercent,
} from './formatters';

describe('formatters', () => {
  it('formats kickoff dates in the local timezone', () => {
    expect(formatKickoff(null)).toBe('Kickoff TBD');
    expect(formatKickoff('invalid')).toBe('Kickoff TBD');
    expect(formatKickoff(new Date(2026, 5, 24, 15, 30).toISOString())).toBe(
      'Jun 24, 03:30 PM',
    );
  });

  it('formats percentages', () => {
    expect(formatPercent(0.456)).toBe('46%');
  });

  it('formats outcomes', () => {
    expect(formatOutcome('home')).toBe('Home');
  });

  it('formats odds', () => {
    expect(formatOdd(2.5)).toBe('2.50');
  });
});
