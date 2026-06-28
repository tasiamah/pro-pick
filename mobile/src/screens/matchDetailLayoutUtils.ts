export const MATCH_DETAIL_TWO_COLUMN_BREAKPOINT = 768;

export function shouldUseMatchDetailTwoColumnLayout(width: number): boolean {
  return width >= MATCH_DETAIL_TWO_COLUMN_BREAKPOINT;
}
