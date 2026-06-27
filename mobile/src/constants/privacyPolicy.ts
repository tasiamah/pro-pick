export type PrivacyPolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const PRIVACY_POLICY_LAST_UPDATED = 'June 27, 2026';

export const PRIVACY_POLICY_INTRO =
  'Pro Pick ("we", "our", or "the app") provides AI-powered football match analysis for entertainment. This policy describes how the mobile app and its supporting API handle information.';

export const PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    heading: 'Summary',
    paragraphs: [
      'Pro Pick does not require an account. We do not sell personal information. The app stores favorite teams and competitions on your device only. Match and prediction data is fetched from our backend API; those requests do not include your name, email address, or other contact details.',
    ],
  },
  {
    heading: 'Information the app stores on your device',
    paragraphs: [
      'When you mark teams or competitions as favorites, those choices are saved locally on your phone using on-device storage (AsyncStorage). This data stays on your device and is not uploaded to our servers.',
    ],
  },
  {
    heading: 'Information sent to our backend',
    paragraphs: [
      'When the app loads matches, predictions, or analytics, it sends standard HTTP requests to the Pro Pick API. These requests may include:',
    ],
    bullets: [
      'Match list filters and pagination parameters you choose in the app',
      "Your device's network information as part of normal internet communication (for example, an IP address visible to our hosting provider for rate limiting and security)",
    ],
  },
  {
    heading: 'Information we do not collect',
    bullets: [
      'No account registration or login',
      'No in-app analytics or advertising SDKs',
      'No access to contacts, photos, microphone, or precise location',
      'No gambling or payment processing through the app',
    ],
  },
  {
    heading: 'Third-party services',
    paragraphs: [
      'The app reads football data through our backend, which uses third-party data providers and cloud hosting (Render, Supabase). Those providers process data under their own terms. The mobile app itself does not embed third-party trackers.',
    ],
  },
  {
    heading: "Children's privacy",
    paragraphs: [
      'Pro Pick is not directed at children under 17 and is intended for entertainment only. We do not knowingly collect personal information from children.',
    ],
  },
  {
    heading: 'Entertainment disclaimer',
    paragraphs: [
      'Pro Pick provides AI analysis for entertainment only. It is not a gambling or betting service and does not guarantee outcomes.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      'We may update this policy from time to time. The "Last updated" date at the top will change when we do. Continued use of the app after an update means you accept the revised policy.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'For privacy questions, contact the developer through the App Store listing.',
    ],
  },
];
