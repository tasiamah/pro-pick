import {
  formatKickoff,
  formatOdd,
  formatOutcome,
  formatPercent,
} from './formatters';

describe('formatters', () => {
  it('formats kickoff dates', () => {
    expect(formatKickoff(null)).toBe('Kickoff TBD');
    expect(formatKickoff('invalid')).toBe('Kickoff TBD');
    expect(formatKickoff('2026-06-24T15:30:00Z')).toBe('Jun 24, 03:30 PM');
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
