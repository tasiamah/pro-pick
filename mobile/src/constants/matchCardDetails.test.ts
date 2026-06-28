import { colors, spacing, typography } from '../theme';

import { MATCH_DETAILS_FOOTER, MATCH_DETAILS_LINK_TEXT } from './matchCardDetails';

describe('matchCardDetails', () => {
  it('uses subtle primaryMuted footer with 8px vertical padding', () => {
    expect(MATCH_DETAILS_FOOTER.backgroundColor).toBe(colors.primaryMuted);
    expect(MATCH_DETAILS_FOOTER.backgroundColor).toBe('rgba(0, 255, 136, 0.1)');
    expect(MATCH_DETAILS_FOOTER.paddingVertical).toBe(spacing.sm);
    expect(MATCH_DETAILS_FOOTER.paddingVertical).toBe(8);
  });

  it('uses label typography for Details link text', () => {
    expect(MATCH_DETAILS_LINK_TEXT).toMatchObject(typography.label);
    expect(MATCH_DETAILS_LINK_TEXT.color).toBe(colors.primary);
    expect(MATCH_DETAILS_LINK_TEXT.textAlign).toBe('center');
  });
});
