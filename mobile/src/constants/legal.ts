/**
 * Privacy-policy endpoint, sourced from Expo env (`eas.json` / `.env`) rather
 * than a shipped source constant so it can be finalized or rotated without
 * cutting a new app release. Returns null when unconfigured or when the value
 * is not an `https://` URL, since this is the only normalization step before
 * the link reaches `Linking.openURL`.
 */
export function getPrivacyPolicyUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim();
  if (!configured) {
    return null;
  }
  const normalized = configured.replace(/\/+$/, '');
  return normalized.startsWith('https://') ? normalized : null;
}

export const RESPONSIBLE_PLAY_TEXT =
  'Pro Pick is intended for adults aged 18 and over. If gambling affects you or someone you know, please seek help from a responsible-gambling service in your region.';

export const BOOKMAKER_INDEPENDENCE_TEXT =
  'Pro Pick is not affiliated with, endorsed by, or sponsored by any bookmaker or betting operator. Odds are shown for informational comparison only.';
