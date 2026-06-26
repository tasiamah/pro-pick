import {
  BOOKMAKER_INDEPENDENCE_TEXT,
  getPrivacyPolicyUrl,
  RESPONSIBLE_PLAY_TEXT,
} from './legal';

describe('legal', () => {
  describe('getPrivacyPolicyUrl', () => {
    const original = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;

    afterEach(() => {
      if (original === undefined) {
        delete process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
      } else {
        process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = original;
      }
    });

    it('returns a secure URL with trailing slashes trimmed when configured', () => {
      process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL = 'https://example.com/privacy/';
      const url = getPrivacyPolicyUrl();
      expect(url).toBe('https://example.com/privacy');
      expect(url).toMatch(/^https:\/\//);
    });

    it('returns null when the endpoint is not configured', () => {
      delete process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
      expect(getPrivacyPolicyUrl()).toBeNull();
    });

    it('rejects non-HTTPS URLs to avoid opening unexpected schemes', () => {
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
