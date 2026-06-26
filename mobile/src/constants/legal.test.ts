import { PRIVACY_POLICY_URL } from './legal';

describe('legal', () => {
  it('points to the published privacy policy in the repository', () => {
    expect(PRIVACY_POLICY_URL).toMatch(/^https:\/\//);
    expect(PRIVACY_POLICY_URL).toContain('PRIVACY_POLICY.md');
  });
});
