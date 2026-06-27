import {
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_SECTIONS,
} from './privacyPolicy';

describe('privacyPolicy', () => {
  it('records when the policy was last updated', () => {
    expect(PRIVACY_POLICY_LAST_UPDATED).toMatch(/\d{4}/);
  });

  it('frames the app as entertainment-only in the intro', () => {
    expect(PRIVACY_POLICY_INTRO).toContain('entertainment');
  });

  it('every section has a heading and some content', () => {
    expect(PRIVACY_POLICY_SECTIONS.length).toBeGreaterThan(0);
    for (const section of PRIVACY_POLICY_SECTIONS) {
      expect(section.heading.length).toBeGreaterThan(0);
      const hasParagraphs = (section.paragraphs?.length ?? 0) > 0;
      const hasBullets = (section.bullets?.length ?? 0) > 0;
      expect(hasParagraphs || hasBullets).toBe(true);
    }
  });

  it('discloses the core privacy commitments App Store review expects', () => {
    const allText = PRIVACY_POLICY_SECTIONS.flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
    ]).join(' ');

    expect(allText).toContain('do not sell personal information');
    expect(allText).toContain('does not require an account');
    expect(allText).toContain('on your device');
    expect(allText).toContain('No gambling or payment processing');
  });
});
