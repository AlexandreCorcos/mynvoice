# Version Control & Update Detection

## Overview

The app uses a polling-based version detection system. When a new version is deployed, users with the app already open see a banner at the top of the screen: **"A new version is available. Click to update."**

## How It Works

1. `frontend/package.json` holds the canonical version number.
2. At build time, Next.js injects it as `NEXT_PUBLIC_APP_VERSION` via `next.config.ts`.
3. `frontend/public/meta.json` holds the same version and is served as a static file.
4. The `useAppVersion` hook polls `/meta.json` every 60 seconds. If the fetched version differs from the compiled version, it sets `hasUpdate = true`.
5. The `AppLayout` renders `<UpdateBanner />` when `hasUpdate` is true.
6. The sidebar displays the current version below the MYNVOICE logo.

## Files

| File | Role |
|---|---|
| `frontend/package.json` | Source of truth for version |
| `frontend/public/meta.json` | Static file polled at runtime |
| `frontend/next.config.ts` | Injects `NEXT_PUBLIC_APP_VERSION` |
| `frontend/src/hooks/useAppVersion.ts` | Polling hook (60s interval) |
| `frontend/src/components/ui/UpdateBanner.tsx` | Top banner UI |
| `frontend/src/app/(app)/layout.tsx` | Renders banner when update detected |
| `frontend/src/components/sidebar.tsx` | Displays version number below logo |

## Releasing a New Version

Every feature or fix commit must bump the version and update `meta.json`:

1. **Bump version** in `frontend/package.json` (follow semver: `MAJOR.MINOR.PATCH`)
2. **Update `meta.json`** to match:
   ```json
   {"version":"0.4.2"}
   ```
3. Commit both files alongside the feature/fix.

### Semver Guide

| Change type | Example | Bump |
|---|---|---|
| Bug fix | Fix invoice total rounding | PATCH `0.4.1 → 0.4.2` |
| New feature | Add expense categories | MINOR `0.4.x → 0.5.0` |
| Breaking change | Redesign auth flow | MAJOR `0.x.x → 1.0.0` |

## Banner Colours

The `UpdateBanner` uses petrol-dark gradient (`#1a3a4a → #0f2530`) to match the app's design system.
