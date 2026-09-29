# Onboarding — foodline-mobile

For Kartikeya and Aayushi. Target: app running on your phone in about fifteen
minutes, without waiting on anyone for keys.

---

## What this is

The Foodline mobile app. Expo SDK 57 / React Native, TypeScript, one codebase for
iOS and Android. It talks to the **existing ERP Supabase project** — there is no
separate mobile backend and no new API.

Three facts that will save you a day if you read them now:

1. **There is no REST API.** `api-v1` returns HTTP 410. Every call is an RPC;
   there are ~343 in the generated types. No direct table reads.
2. **WorkOS AuthKit owns the session**, not Supabase Auth. Supabase trusts the
   WorkOS JWT as a third-party provider. **Never call `supabase.auth.*`.**
3. **Company scope travels in the `x-erp-company-id` header**, and selection is
   not authorization — every RPC revalidates membership server-side.

---

## Setup

You need **Node 22+**. You do **not** need Android Studio or Xcode — every native
dependency in the app ships inside Expo Go.

```bash
git clone https://github.com/mehulpradhan-ui/foodline-mobile.git
cd foodline-mobile
./scripts/bootstrap.sh          # deps, .env.local in demo mode, typecheck
npm run start:go
```

Install **Expo Go** on your phone, scan the QR code, and the app runs — with a
real camera, which matters because the scanner is the part of this product a
laptop cannot test.

If `bootstrap.sh` is missing or fails:

```bash
npm ci
cp .env.example .env.local
npm run typecheck
npm run start:go
```

---

## Environment variables

`.env.example` is annotated — read it rather than this section for the detail.

**You do not need any real values to start.** `EXPO_PUBLIC_DEMO_MODE=1` runs the
entire app on local fixtures: no backend, no WorkOS, no network. Build against
that, then switch.

When you do need live data, ask Mehul for:

| Variable | What it is |
|---|---|
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | staging anon key |
| `EXPO_PUBLIC_WORKOS_CLIENT_ID` | AuthKit client id |

The Supabase URL and the redirect URI are already in `.env.example` and are not
secret.

### Two things that will bite

**Never put a service-role key in any `EXPO_PUBLIC_` variable.** Those are
compiled into the shipped app and readable by anyone who downloads the APK. A
service-role key bypasses row-level security entirely.

**`.env.local` is gitignored. Keep it that way.** If you ever need to share a
value, send it directly — not through the repo, not in a commit, not in a
screenshot of your editor.

---

## How the work is organised

Three agents work this codebase in parallel, and **file ownership is absolute**:

| Lane | Owns | Never touches |
|---|---|---|
| Claude Code | `src/` | `.github/`, `app.json`, `eas.json` |
| Codex | `.github/`, `app.json`, `eas.json`, `android/`, `assets/` | `src/` |
| Cowork | contracts and specs only | any repo's `main` |

Before starting, read the contracts in the **`foodline-cowork`** repo:

- `contracts/backend.md` — auth, RPCs, company scope
- `contracts/design.md` — the palette, sampled from the approved mockups
- `contracts/actions.md` — actions are data, not markup
- `contracts/personas.md` — who sees what, and why hiding is not securing
- `contracts/flows.md` — every end-to-end flow, sequenced
- `contracts/auth.md` — the session lifecycle and biometric model

`handoffs/` has the current task queue per agent.

---

## Rules that are not style preferences

**Never hand-pick a colour.** Every token lives in `tailwind.config.js` and was
sampled from the approved mockups. Adding a hex anywhere else is how a screen
ends up one shade off in front of a customer.

**Never invent an RPC name.** If you cannot find it, write a defensive mapper,
leave a `TODO(wiring)`, and add it to `BLOCKERS.md` with an owner. A guessed name
typechecks against nothing and fails at runtime in a demo.

**Row version and idempotency key on every mutation.** The row version goes back
unchanged; a rejection means someone else moved it, so re-read and tell the user
rather than overwriting. The idempotency key is generated when the user commits
and **reused on every retry of that attempt** — regenerating it on retry is what
double-counts stock, and it will happen on a warehouse floor with bad signal long
before it happens in testing.

**Demo fixture ships in the same commit as the live adapter.** Every screen. This
is what lets the app be demoed when staging is down.

**No path submits a purchase order without a human approving on a screen that
shows the lines.** Not behind a setting, not behind a flag, not in copy. If the
model drafts a wrong PO and a vendor fulfils it, the liability is ours.

**Never `--no-verify`.** A bypassed pre-push hook took the ERP demo site down on
run #51.

---

## Branches

One task, one branch, one person. `feat/<short-name>` off `main`. `main` stays
buildable. Open a PR rather than pushing to `main`.

Typecheck and lint pass before anything is called done:

```bash
npm run typecheck && npm run lint
```

---

## Known open items

Check `BLOCKERS.md` for the live list. As of the end of September:

- CI produces no APK — fails at about 50 seconds. Diagnosis and a replacement
  workflow are in `docs/ci/`.
- Where persona comes from in the session payload is unconfirmed.
- Proof of delivery collects a signature and photo but does not submit.
- Warehouse and goods-receipt selection in receiving are stubbed to constants.

---

## If something does not work

Test **on a phone, on mobile data, not wifi** — that is the actual demo
condition, and it surfaces things a simulator never will.

For anything that looks like a permission or scope problem, remember that the
server is the gate. If an RPC returns data it should not, that is a backend bug;
do not fix it by hiding a screen.
