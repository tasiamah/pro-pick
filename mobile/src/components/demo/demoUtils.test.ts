import {
  classifyOddsTier,
  clampPercentage,
  formatOddsTierLabel,
  formatValueStatusLabel,
} from './demoUtils';

describe('demoUtils', () => {
  it('classifies odds tiers from decimal prices', () => {
    expect(classifyOddsTier(1.75)).toBe('low');
    expect(classifyOddsTier(2.5)).toBe('medium');
    expect(classifyOddsTier(4)).toBe('high');
  });

  it('returns null for invalid odds tier inputs', () => {
    expect(classifyOddsTier(Number.NaN)).toBeNull();
    expect(classifyOddsTier(Number.POSITIVE_INFINITY)).toBeNull();
    expect(classifyOddsTier(0)).toBeNull();
    expect(classifyOddsTier(-1)).toBeNull();
  });

  it('labels odds tiers for badges', () => {
    expect(formatOddsTierLabel('low')).toBe('LOW ODDS');
    expect(formatOddsTierLabel('medium')).toBe('MEDIUM ODDS');
    expect(formatOddsTierLabel('high')).toBe('HIGH ODDS');
  });

  it('labels value statuses for badges', () => {
    expect(formatValueStatusLabel('value')).toBe('Value Bet Detected');
    expect(formatValueStatusLabel('overpriced')).toBe('Overpriced');
  });

  it('clamps percentage values to 0 through 100', () => {
    expect(clampPercentage(-5)).toBe(0);
    expect(clampPercentage(120)).toBe(100);
    expect(clampPercentage(81)).toBe(81);
    expect(clampPercentage(Number.NaN)).toBe(0);
    expect(clampPercentage(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
