# App Store screenshots (PP-91)

Capture marketing screenshots for App Store Connect before submission. Store the
final PNG files in this directory so the team has a single source of truth.

## Prerequisites

1. Seed demo data so screens show rich content (`backend/README.md` or GitHub
   Actions **Seed demo database** workflow).
2. Set `EXPO_PUBLIC_API_URL=https://pro-pick.onrender.com` in `mobile/.env`.
3. Run the app on an **iPhone 15 Pro Max** simulator (6.7-inch display) or a
   physical device with the same logical resolution.

## Capture steps

```bash
cd mobile
npm install
npx expo start
```

Press `i` to open the iOS Simulator. Navigate each screen below, then save a
screenshot with **File → Save Screen** (or `Cmd + S` in Simulator).

Hide the simulator bezel if prompted; App Store Connect expects full-screen PNGs.

## Required shots (6.7-inch)

Save files under `docs/store-assets/screenshots/iphone-6.7-inch/` using these
names:

| File | Screen | What to show |
|------|--------|--------------|
| `01-home.png` | Home | AI predictions hero, date chips, and match cards |
| `02-matches.png` | Matches | Search bar, status filter, and odds-tier badges |
| `03-match-detail.png` | Match detail | Confidence, odds, team form, and analysis sections |
| `04-favorites.png` | Favorites | At least one saved favorite with match cards |
| `05-analytics.png` | Analytics | Stat cards and ROI trend chart |

## Dimensions

| Display | Pixel size | Folder |
|---------|------------|--------|
| 6.7-inch (required) | 1290 × 2796 | `screenshots/iphone-6.7-inch/` |
| 6.5-inch (optional) | 1284 × 2778 | `screenshots/iphone-6.5-inch/` |

Apple accepts up to ten screenshots per device size. The five shots above cover
the core Pro Pick flows.

## Upload

In App Store Connect → **App Store** → **Screenshots**, select **6.7" Display**
and upload the PNGs from `iphone-6.7-inch/`. Repeat for 6.5-inch if you capture
that set.

## Sign-off

PP-91 screenshots are **ready** when all five required 6.7-inch PNGs exist in
`docs/store-assets/screenshots/iphone-6.7-inch/` and have been reviewed for
legibility on a dark background.
