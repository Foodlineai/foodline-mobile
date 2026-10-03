# foodline-mobile — agent rules

**Before touching anything, read the operating brief** in the Foodline AI project:
`claude/00-agent-handoff-operating-brief.md`. It holds the lane assignments, the three-repo
map, the backend contract and the live blockers. This file covers what is specific to this repo.

**Your lane is B — mobile product.** Do not touch `Mehul192001/foodline-android`; it is a
separate Kotlin demo app that is frozen. See §2 and §3 of the brief.

**Coordination lives in `~/Documents/foodline-cowork`** — read `BOARD.md` and the other
agents' `status/*.md` before you touch anything, and write your own status file naming the
files you claim *before* you start. Your full handoff is in `handoffs/`.

---

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# Foodline Mobile — project rules

This section is Foodline-specific and takes precedence over the generic Expo notes above.
It applies to **every** agent working in this repo: Codex, Claude Code, and Cowork.

## What this app is

The mobile client for **Foodline AI**, the ERP for independent food distributors
($5M–$500M revenue). It is a companion to the live web ERP, not a replacement.
Primary users are buyers and warehouse staff on a phone, often on bad connections.

**Backend is the ERP's existing Supabase project.** This app does not own data.

## The backend is the live ERP — verified facts, not assumptions

Read from `Foodlineai/frontend` (branch `mehul/ui-refresh-10sep`) on 22 Sep 2026:

- **Supabase project `fzavogttmmyyeuguvmry`** (staging), shared with the web ERP.
- **There is no REST API.** `supabase/functions/api-v1` returns HTTP 410: *"This legacy
  API has been retired. Use the Supabase Data API, RLS-protected views, and approved RPCs."*
  So every call from this app is an RPC. There are ~343 of them.
- **WorkOS AuthKit owns the session, not Supabase Auth.** The web ERP does
  `createClient(url, publishableKey, { accessToken: async () => workosToken })` —
  Supabase trusts the WorkOS JWT as a third-party provider. **Never call `supabase.auth.*`.**
- **Company scope travels in the `x-erp-company-id` header.** Selection is not
  authorization: every public RPC re-validates active DB membership server-side.
- `src/lib/database.types.ts` is copied verbatim from the ERP repo. Regenerate both
  together — never hand-edit it.

Mirror file in the ERP repo: `src/integrations/supabase/application-scope.server.ts`.
If that file changes, `src/lib/supabase.ts` here probably needs the same change.

## Receiving runs on the ERP's scanner subsystem

The ERP already has a handheld API, which is the reason this app exists:

```
list_receiving_location_warehouses   pick the warehouse (no args; company header scopes it)
get_governed_receiving_dock          pick the delivery (no args; filtered client-side by warehouse)
start_scanner_session                claim the work
get_governed_scanner_receiving_queue what is still owed
submit_scanner_scan                  record each case
save_governed_scanner_receiving_capture / close_scanner_session
```

Several of these take `Args: never` — they are scoped entirely by the WorkOS
JWT plus the `x-erp-company-id` header. Do not invent parameters for them.

Every mutation carries **row versions** (optimistic concurrency) and an
**idempotency key**. Preserve both. A dropped connection mid-scan must never
double-count stock — that property is the whole point, and it is easy to break
by "simplifying" a retry.

## The one architectural rule



Screens never import `@supabase/supabase-js`. They call `api` from `@/lib/api`.

```
src/app/**                       screens — expo-router, presentation + local state only
src/lib/api/ports.ts             the interface every backend must satisfy
src/lib/api/supabase-adapter.ts  the live implementation (WorkOS token + ERP RPCs)
src/lib/api/types.ts             OUR domain types, not raw RPC payloads
src/features/auth/workos.ts      AuthKit PKCE, tokens in SecureStore
```

If the ERP schema changes, the fix belongs in the adapter's mappers. If a screen
has a `snake_case` field name in it, that is a bug.

**Everything is an RPC.** There are no direct table reads or writes — the ERP
retired that path. Business rules must never be duplicated between the web ERP
and this app; that divergence is the failure mode we are explicitly designing against.

## The designs are the spec

`Foodline-Mobile-01..05` (22 Sep 2026) define this app: Master Admin, Sales,
Purchasing, Inventory Employee, Routes/Driver. Build to them.

- **Shell:** five tabs — Home · My Work · Activity · Search · More. "More" is the
  workspace directory, not a settings dump.
- **Header on every screen:** "Foodline AI ⌄", a blue context pill (`Admin · All
  operations`, `Inventory · Atlanta warehouse`), and the actor's avatar. The pill
  states role *and* scope — it is how someone knows which company they are touching.
- **Palette is sampled from the mockups**, in `tailwind.config.js`:
  brand `#3B65ED`, pressed `#1D47E5`, tint `#EAF1FD`, ink `#0B1020`, muted `#475776`,
  surface `#F7FAFD`, warn tint `#FEF4D9`. Do not introduce a colour that is not in
  that file, and do not hand-pick one — take it from a mockup and add it there.
- **The app is role-scoped.** An inventory employee sees stock work; an admin sees
  everything. Gate on the `permissionKeys` in the session, never on a hardcoded role
  string.
- Icons are `@expo/vector-icons` Feather, to match the line weight in the designs.

## Screen map

Every module screen follows the same skeleton from the mockups: `AppHeader`
(context pill) → `ModuleHero` or a big title → "needs attention" list →
supporting list → AI card. The `<Module> tools` directories are all one screen,
`app/(app)/tools/[module].tsx`, driven by `features/workspaces/tools-catalog.ts`
— add a tool there, not in a new file.

| Route | Mockup | Live RPCs |
|---|---|---|
| `(tabs)/index` Home | 01 left | `get_current_commercial_dashboard` |
| `(tabs)/more` All workspaces | 01 right | — (static catalog) |
| `sales` | 02 left | `get_current_sales_orders_workspace` |
| `purchasing` | 03 left | `purchase_order_directory_snapshot` |
| `inventory` | 04 left | `product_directory_snapshot` |
| `routes` | 05 left | `get_current_delivery_route_workspace` |
| `stop/[id]` | 05 right | `get_current_delivery_stop_detail` |
| `receiving` | — | the scanner subsystem (see above) |
| `tools/[module]` | 02/03/04 right | — (static catalog) |

Unbuilt destinations render as "Coming soon" rather than being hidden, so the
demo shows the real shape of the product and nothing dead-ends silently.

## Conventions

- TypeScript strict. No `any` outside adapter mapper boundaries (already isolated there).
- NativeWind classes for styling. Brand tokens live in `tailwind.config.js` — use
  `brand`, `accent`, `ink`, `surface`, never raw hex in components.
- Server state: TanStack Query. Local state: `useState`. No Redux, no MobX, no Zustand.
- Every list screen needs loading, error, empty and pull-to-refresh states. Use the
  primitives in `@/components/ui` rather than rolling new ones.
- Touch targets ≥ 44pt. This is used with cold hands in a walk-in cooler.

## Before you say a task is done

```bash
npm run typecheck   # must pass clean
npm run lint
```

Do not commit `ios/` or `android/` — they are generated by `expo prebuild` (CNG).
Native config belongs in `app.json` or a config plugin.

## Multi-machine, multi-agent workflow

Three machines touch this repo (MacBook Air, Mac Studio, cloud sessions) and three
agents write to it. Git is the only source of truth.

1. **Always `git pull --rebase` before starting.** Another agent or machine may have pushed.
2. **One branch per task**, named `feat/…`, `fix/…`, `chore/…`. Never commit straight to `main`.
3. **Commit before switching machines**, even mid-task — push a WIP commit rather than
   leaving work on a laptop that is about to be closed.
4. **Never force-push shared branches.**
5. `scripts/bootstrap.sh` brings any machine to a working state from a fresh clone.

## Build reality (read before promising a build)

- **No Android Studio or Xcode is required anywhere.** Android Studio is an IDE around
  Gradle + the Android SDK; CI installs those directly.
- Debug APK on every push: `.github/workflows/android.yml` → download from the run's artifacts.
- iOS and release builds: `eas build` (Expo's cloud Macs) via `.github/workflows/eas.yml`.
- Local Mac builds still work (`npm run ios` / `npm run android`) but are never required.
- Cloud sandboxes cannot run an Android emulator (no KVM) — they can build an APK, not run one.
