# Codex is inactive — reassigning its lane

Three things Codex owned are now unowned. One of them is the only thing standing
between this work and a shareable build, so it cannot simply wait.

---

## What was Codex's, and where it goes

| Was | Now | Why |
|---|---|---|
| **C1/C2 · CI and the APK** | **Claude Code** | The fix is one config line and nobody else can run it |
| **C7–C10 · Image generation** | **Mehul**, or deferred | Nothing in the pipeline can generate images |
| **C11/C12 · Device QA** | **Kartikeya or Aayushi** | Needs a handset in a hand |

### The file-ownership rule is suspended for CI, deliberately

The rule says Claude Code owns `src/` and never touches `.github/`, `app.json`
or `eas.json`. That rule exists to stop two agents editing one file at the same
time. **With Codex inactive there is no second agent, so the rule is protecting
nothing and blocking something.**

Claude Code takes `.github/` and `android/gradle.properties` until Codex is back,
and hands them straight back when it is. Record that in `DECISIONS.md` so it does
not quietly become permanent.

---

## C1/C2 — the CI fix, in full

Run #2 on `fix/android-apk-pipeline` was **cancelled at 46m 16s**, not failed.
Typecheck and lint passed. The APK job died on the 45-minute job timeout, mid
`assembleRelease`.

The log builds native code for **four ABIs** — `arm64-v8a`, `armeabi-v7a`, `x86`
and `x86_64` — separately, for `expo-updates`, `react-native-screens` and
`react-native-worklets`, plus two NDK installs and a cold Gradle download.

Every Android handset you will demo on is arm64. The other three are emulator and
pre-2015 targets.

**Fix, in order of impact:**

1. **One ABI.** In `android/gradle.properties`:
   ```properties
   reactNativeArchitectures=arm64-v8a
   ```
   This alone should take the native stage from ~35 minutes to under 10.

2. **Debug, not release.** The job runs `./gradlew assembleRelease`. A debug
   build skips R8 and release signing and sideloads identically. Keep release as
   a separate, less frequent job.

3. **`timeout-minutes: 90`** while tuning, so a slow run reports a real failure
   rather than a cancellation that says nothing.

4. **`NODE_ENV=production`** on the build step. The log warns it is unset and
   Metro is falling back.

5. The Gradle cache was cold on the first run. With one ABI it will start
   earning its keep.

**Done when:** a green run produces a downloadable APK in under 15 minutes, on
every PR and every merge to `main`.

---

## C7–C10 — images, and an honest option

Codex was going to extract the 3D hero illustrations as transparent PNGs and
generate the per-module set, the icon set, and the app icon.

**Nothing else in this pipeline can generate images.** I cannot, and Claude Code
should not be spending a session on it.

Three options, in the order I would take them:

1. **Ship without new art.** The existing renders already contain the heroes.
   Screens render fine with the illustration slot empty — the design holds
   without it. This costs nothing and blocks nothing.
2. **Mehul extracts them** from the existing renders with any image tool. Crude
   crops will look rough at phone density, so this is worth doing properly or
   not at all.
3. **Wait for Codex.** Acceptable — this is the lowest-value item on the board.

**Do not let this block Phase 0.** No flow in the punchlist needs an image.

---

## C11/C12 — device QA

Needs someone holding a phone, on mobile data, not wifi. That is the actual demo
condition and it surfaces what a simulator never will.

Kartikeya or Aayushi, once the APK builds. Written pass/fail per screen, filed to
Claude Code rather than fixed in place.

The barcode path specifically needs both inputs tested: the device camera, and a
hardware wedge scanner typing into the same field. Warehouses use their own guns.

---

## What Claude Code should do first

Still Phase 0 items 1 and 2 — sales order detail and item detail. Both RPCs are
confirmed, both close multiple dead ends.

**But do the CI config change first.** It is one line, it takes a minute, and
until it lands nothing anyone builds can be put in front of a customer.
