# Why the APK build fails in ~50 seconds

`BLOCKERS.md` carries this as P1, cause unknown. I cannot read the run logs from
here, so this is a ranked set of hypotheses — but the timing is a strong signal
and the first one fits it almost exactly.

**A ~50s failure means the job died before Gradle did any real work.** A genuine
compile failure in an Expo app takes four to eight minutes to reach. Fifty
seconds is checkout, Node setup, part of an install, and then a hard stop. That
rules out most code-level causes and points at the environment.

## 1 · No Android SDK in the runner — most likely

`ubuntu-latest` ships a JDK but **not** a usable Android SDK with accepted
licences. Without `android-actions/setup-android`, the first Gradle invocation
fails on a missing `ANDROID_HOME` or unaccepted licences, in well under a minute.

The workflow in `ci/android-apk.yml.md` adds it. If the current workflow has a
`setup-java` step but no `setup-android` step, this is your bug and the fix is
one block.

**Check:** does the log end with `SDK location not found` or
`Failed to install the following Android SDK packages as some licences have not
been accepted`?

## 2 · `android/` is gitignored and never generated

The agent contract says never commit `ios/` or `android/` because CNG generates
them. Correct — but that means CI **must** run `npx expo prebuild` before
`./gradlew`. If the workflow goes straight to Gradle, it fails instantly on a
missing directory or missing wrapper.

**Check:** `./gradlew: No such file or directory`, or a Gradle error about no
project at `android/`.

## 3 · `npm ci` fails on a lockfile mismatch

`npm ci` aborts rather than resolving, and it aborts fast. If `package.json` was
edited without regenerating `package-lock.json`, this is a sub-minute failure.

**Check:** `npm ci can only install packages when your package.json and
package-lock.json are in sync`.

## 4 · The PAT lacks `workflow` scope

Already recorded in `BLOCKERS.md` as its own P0. It does not cause a failing run,
but it does mean workflow edits have to go through the web editor — so a fix
pushed from a machine may silently never reach `.github/workflows/`. Worth ruling
out before concluding a fix did not work.

**Check:** does the workflow file on GitHub actually contain your change?

## 5 · Node version

Expo SDK 57 wants Node 20+. A runner pinned to 18 fails during install.

---

## Fastest way to find out

Open the failed run, expand the last step that ran, and read the final twenty
lines. The five causes above produce visibly different errors — this is a
two-minute diagnosis once someone has the log, and I would do that before
applying any fix, including mine.

If it turns out to be cause 1, which I would bet on, the workflow in this drop
replaces the existing file wholesale and you are done.

## The fallback that always works

If CI stays broken and Miami is close, build on the Studio:

```bash
cd ~/Documents/QubeClaw/foodline-mobile
npm ci
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
```

That needs a local Android SDK, which the Studio can have and the Air does not
need. Not a reason to leave CI broken — a demo build that only one laptop can
produce is a single point of failure on a sales trip — but it unblocks today.
