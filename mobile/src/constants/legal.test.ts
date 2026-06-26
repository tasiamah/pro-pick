import {
  BOOKMAKER_INDEPENDENCE_TEXT,
  getPrivacyPolicyUrl,
  PRIVACY_POLICY_URL,
  RESPONSIBLE_PLAY_TEXT,
} from './legal';

describe('legal', () => {
  it('points to the published privacy policy in the repository', () => {
    expect(PRIVACY_POLICY_URL).toMatch(/^https:\/\//);
    expect(PRIVACY_POLICY_URL).toContain('PRIVACY_POLICY.md');
  });

  describe('getPrivacyPolicyUrl', () => {
    const original = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;

    afterEach(() => {
      if (original === undefined) {
        delete process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
      } else {
        process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = original;
      }
    });

    it('falls back to the published policy when no override is configured', () => {
      delete process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
      expect(getPrivacyPolicyUrl()).toBe(PRIVACY_POLICY_URL);
    });

    it('prefers a secure env override with trailing slashes trimmed', () => {
      process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = 'https://example.com/privacy/';
      expect(getPrivacyPolicyUrl()).toBe('https://example.com/privacy');
    });

    it('rejects non-HTTPS overrides to avoid opening unexpected schemes', () => {
      process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = 'http://example.com/privacy';
      expect(getPrivacyPolicyUrl()).toBeNull();

      process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = 'javascript:alert(1)';
      expect(getPrivacyPolicyUrl()).toBeNull();
    });
  });

  it('states 18+ and responsible-gambling guidance', () => {
    expect(RESPONSIBLE_PLAY_TEXT).toContain('18 and over');
    expect(RESPONSIBLE_PLAY_TEXT).toContain('responsible-gambling');
  });

  it('states independence from any bookmaker for informational use only', () => {
    expect(BOOKMAKER_INDEPENDENCE_TEXT).toContain('not affiliated');
    expect(BOOKMAKER_INDEPENDENCE_TEXT).toContain('bookmaker');
    expect(BOOKMAKER_INDEPENDENCE_TEXT).toContain('informational comparison only');
  });
});
