import { spacing } from '../theme';

export const MATCHES_GRID_COLUMNS = 2;
export const MATCHES_GRID_GUTTER = spacing.md;
export const MATCHES_SCREEN_HORIZONTAL_PADDING = spacing.lg;

export type MatchesGridMetrics = {
  columnWidth: number;
  contentWidth: number;
  gutter: number;
};

export function getMatchesGridMetrics(windowWidth: number): MatchesGridMetrics {
  const contentWidth = Math.max(
    windowWidth - MATCHES_SCREEN_HORIZONTAL_PADDING * 2,
    0,
  );
  const columnWidth = Math.floor(
    (contentWidth - MATCHES_GRID_GUTTER * (MATCHES_GRID_COLUMNS - 1)) /
      MATCHES_GRID_COLUMNS,
  );

  return {
    columnWidth,
    contentWidth,
    gutter: MATCHES_GRID_GUTTER,
  };
}

export function chunkMatchesGridRows<T>(
  items: T[],
  columns = MATCHES_GRID_COLUMNS,
): T[][] {
  if (!Number.isFinite(columns) || columns <= 0) {
    return [];
  }

  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }

  return rows;
}

export function getMatchesScrollBottomPadding(tabBarHeight: number): number {
  return tabBarHeight + spacing.lg;
}
