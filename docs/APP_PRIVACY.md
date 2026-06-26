# App Store Connect — App Privacy (PP-96)

Use this guide when completing **App Privacy** for Pro Pick (`com.propick.app`)
in App Store Connect. Answers reflect the current mobile app and production API.

Set the **Privacy Policy URL** on the app record to:

`https://github.com/tasiamah/pro-pick/blob/main/docs/PRIVACY_POLICY.md`

## Questionnaire answers

| App Store Connect question | Answer |
|----------------------------|--------|
| Do you or your third-party partners collect data from this app? | **No** — the app does not collect data off the device for tracking or account profiles. Favorites stay on-device only. API calls carry no user identifiers. |
| Data used to track you | **None** |
| Data linked to you | **None** |
| Data not linked to you | **None** (no analytics SDKs; server-side IP handling for API rate limiting is outside the app binary and is not declared as app-collected data) |

If Apple requires a follow-up about network requests, note that the app fetches
public match and prediction JSON from the Pro Pick API without sending personal
information.

## Nutrition label result

The public App Store privacy label should show **Data Not Collected** for the
current Pro Pick build.

## Revisit when

Update this guide and the privacy policy if you add:

- User accounts or authentication
- Analytics, crash reporting, or advertising SDKs
- Uploading favorites or profile data to a server
- Payments or subscriptions (for example RevenueCat)
