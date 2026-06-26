# Pro Pick Privacy Policy

Last updated: June 27, 2026

Pro Pick ("we", "our", or "the app") provides AI-powered football match analysis
for entertainment. This policy describes how the mobile app and its supporting
API handle information.

## Summary

Pro Pick does not require an account. We do not sell personal information. The
app stores favorite teams and competitions on your device only. Match and
prediction data is fetched from our backend API; those requests do not include
your name, email address, or other contact details.

## Information the app stores on your device

When you mark teams or competitions as favorites, those choices are saved
locally on your phone using on-device storage (AsyncStorage). This data stays on
your device and is not uploaded to our servers.

## Information sent to our backend

When the app loads matches, predictions, or analytics, it sends standard HTTP
requests to the Pro Pick API (`https://pro-pick.onrender.com` in production).
These requests may include:

- Match list filters and pagination parameters you choose in the app
- Your device's network information as part of normal internet communication
  (for example, an IP address visible to our hosting provider for rate limiting
  and security)

We do not intentionally collect names, email addresses, phone numbers, precise
location, contacts, photos, or payment information through the app.

## Information we do not collect

- No account registration or login
- No in-app analytics or advertising SDKs
- No access to contacts, photos, microphone, or precise location
- No gambling or payment processing through the app

## Third-party services

The app reads football data through our backend, which uses third-party data
providers and cloud hosting (Render, Supabase). Those providers process data
under their own terms. The mobile app itself does not embed third-party
trackers.

## Children's privacy

Pro Pick is not directed at children under 17 and is intended for entertainment
only. We do not knowingly collect personal information from children.

## Entertainment disclaimer

Pro Pick provides AI analysis for entertainment only. It is not a gambling or
betting service and does not guarantee outcomes.

## Changes

We may update this policy from time to time. The "Last updated" date at the top
will change when we do. Continued use of the app after an update means you accept
the revised policy.

## Contact

For privacy questions, open an issue at
https://github.com/tasiamah/pro-pick/issues or contact the developer through
the App Store listing.
