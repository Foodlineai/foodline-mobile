# Foodline Mobile

iOS + Android client for the Foodline AI ERP. One codebase, Expo SDK 57 / React Native 0.86.

## Quick start on any machine

```bash
git clone <repo> && cd foodline-mobile
./scripts/bootstrap.sh
npm run start:go        # scan the QR code with Expo Go
```

The app requires the live Foodline backend. Copy `.env.example` to `.env.local`
and provide the browser-safe Supabase publishable key before starting it.

## Getting a build without Android Studio or Xcode

| You want | Do this | Needs |
|---|---|---|
| Android APK to sideload | Push a branch → GitHub Actions **Android APK** → download artifact | Nothing local |
| iOS build / TestFlight | Actions → **EAS Cloud Build** → run workflow | `EXPO_TOKEN` secret |
| Live reload on a phone | `npm run start:go` | Expo Go app |
| Native debugging | `npm run android` / `npm run ios` on a Mac | Android SDK / Xcode |

Neither Mac needs Android Studio. Gradle and the Android SDK are installed by CI.

## Layout

```
src/app/            screens (expo-router, file = route)
src/lib/api/        the only place that knows about the backend
src/components/ui/  shared primitives
src/features/       cross-screen logic (auth)
```

`AGENTS.md` is the contract every agent and machine follows. Read it first.

## Wiring to the live ERP

Already wired against the real backend (Supabase `fzavogttmmyyeuguvmry`, the same
project the web ERP uses). `src/lib/database.types.ts` is the ERP's generated types,
copied verbatim. To go live:

1. Put the Supabase **publishable key** in `.env.local`
2. Register `foodline://auth/callback` as a WorkOS AuthKit redirect URI

Auth is **WorkOS AuthKit**, not Supabase Auth — the WorkOS access token is handed to
Supabase as a third-party JWT, exactly as the web ERP does. Company scope travels in
the `x-erp-company-id` header.

Receiving is built on the ERP's existing scanner RPCs (`start_scanner_session`,
`get_governed_scanner_receiving_queue`, `submit_scanner_scan`), with row-version and
idempotency guards preserved.
