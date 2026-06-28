import { MATCH_DETAIL_TWO_COLUMN_BREAKPOINT, shouldUseMatchDetailTwoColumnLayout } from './matchDetailLayoutUtils';

describe('matchDetailLayoutUtils', () => {
  it('uses two columns at and above the breakpoint', () => {
    expect(shouldUseMatchDetailTwoColumnLayout(MATCH_DETAIL_TWO_COLUMN_BREAKPOINT)).toBe(
      true,
    );
    expect(shouldUseMatchDetailTwoColumnLayout(MATCH_DETAIL_TWO_COLUMN_BREAKPOINT - 1)).toBe(
      false,
    );
  });
});
