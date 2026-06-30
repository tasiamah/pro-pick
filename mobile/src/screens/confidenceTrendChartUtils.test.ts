import { formatConfidenceTooltipValue } from './confidenceTrendChartUtils';

describe('confidenceTrendChartUtils', () => {
  it('formats confidence tooltip values', () => {
    expect(formatConfidenceTooltipValue(76)).toBe('confidence : 76');
  });
});
