import { spacing } from '../theme';

import {
  chunkMatchesGridRows,
  getMatchesGridMetrics,
  getMatchesScrollBottomPadding,
  MATCHES_GRID_GUTTER,
  MATCHES_SCREEN_HORIZONTAL_PADDING,
} from './matchesGridLayout';

describe('matchesGridLayout', () => {
  it('computes equal column widths that fit inside horizontal padding', () => {
    const windowWidth = 390;
    const { columnWidth, contentWidth, gutter } = getMatchesGridMetrics(windowWidth);

    expect(contentWidth).toBe(windowWidth - MATCHES_SCREEN_HORIZONTAL_PADDING * 2);
    expect(gutter).toBe(MATCHES_GRID_GUTTER);
    expect(columnWidth * 2 + gutter).toBeCloseTo(contentWidth, 5);
  });

  it('adds clearance above the tab bar to scroll padding', () => {
    expect(getMatchesScrollBottomPadding(64)).toBe(64 + spacing.lg);
  });

  it('chunks match lists into grid rows', () => {
    expect(chunkMatchesGridRows([1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4], [5]]);
  });
});
