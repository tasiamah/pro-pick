import { formatRiskDistributionTooltip } from './riskDistributionChartUtils';

describe('riskDistributionChartUtils', () => {
  it('formats risk distribution tooltip text', () => {
    expect(formatRiskDistributionTooltip('Medium Risk', 14)).toBe('Medium Risk : 14');
  });
});
