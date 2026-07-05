import { formatMarketPickLabel, formatMarketSectionTitle } from './marketLabels';

describe('formatMarketPickLabel', () => {
  it('formats BTTS picks', () => {
    expect(
      formatMarketPickLabel({
        market: 'btts',
        model_version: 'v1',
        probabilities: { yes: 0.6, no: 0.4 },
        recommended_outcome: 'yes',
        confidence: 0.6,
      }),
    ).toBe('BTTS Yes');
  });

  it('formats over/under picks', () => {
    expect(
      formatMarketPickLabel({
        market: 'over_under_25',
        model_version: 'v1',
        probabilities: { over: 0.44, under: 0.56 },
        recommended_outcome: 'under',
        confidence: 0.56,
      }),
    ).toBe('Under 2.5');
  });
});

describe('formatMarketSectionTitle', () => {
  it('returns readable section titles', () => {
    expect(formatMarketSectionTitle('btts')).toBe('Both Teams to Score');
    expect(formatMarketSectionTitle('over_under_25')).toBe('Over / Under 2.5');
  });
});
