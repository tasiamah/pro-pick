/**
 * Published privacy policy (PP-96), kept in the repo so the in-app link always
 * resolves even without extra Expo configuration.
 */
export const PRIVACY_POLICY_URL =
  'https://github.com/tasiamah/pro-pick/blob/main/docs/PRIVACY_POLICY.md';

/**
 * Resolves the privacy-policy URL. Prefers the Expo env override
 * (`EXPO_PUBLIC_PRIVACY_POLICY_URL`, from `eas.json` / `.env`) so it can be
 * rotated without an app release, otherwise uses the published policy above.
 * Returns null unless the resolved value is an `https://` URL, since this is the
 * only normalization step before the link reaches `Linking.openURL`.
 */
export function getPrivacyPolicyUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() || PRIVACY_POLICY_URL;
  const normalized = configured.replace(/\/+$/, '');
  return normalized.startsWith('https://') ? normalized : null;
}

export const RESPONSIBLE_PLAY_TEXT =
  'Pro Pick is intended for adults aged 18 and over. If gambling affects you or someone you know, please seek help from a responsible-gambling service in your region.';

export const BOOKMAKER_INDEPENDENCE_TEXT =
  'Pro Pick is not affiliated with, endorsed by, or sponsored by any bookmaker or betting operator. Odds are shown for informational comparison only.';
