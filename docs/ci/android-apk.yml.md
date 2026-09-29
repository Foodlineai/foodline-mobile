> Drop at `.github/workflows/android-apk.yml` in `foodline-mobile`.
> Delete this quote block — the file below is the whole workflow.

```yaml
name: Android APK

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
    inputs:
      demo_mode:
        description: Build with demo fixtures instead of the live backend
        type: boolean
        default: true

# One build per branch. A new push cancels the old run instead of queueing
# behind it — this alone removes most of the "CI is stuck" noise.
concurrency:
  group: apk-${{ github.ref }}
  cancel-in-progress: true

jobs:
  apk:
    runs-on: ubuntu-latest
    timeout-minutes: 45

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      # setup-android is what was almost certainly missing. Without it there is
      # no SDK, no licences, and Gradle dies in under a minute — which matches
      # the ~50s failure exactly.
      - uses: android-actions/setup-android@v3
        with:
          packages: 'platforms;android-35 build-tools;35.0.0 platform-tools'

      - name: Install dependencies
        run: npm ci

      - name: Typecheck and lint
        run: |
          npm run typecheck
          npm run lint

      # CNG owns android/. It is gitignored, so it must be generated here.
      # --clean guarantees the build reflects app.json, not a stale local run.
      - name: Prebuild Android project
        run: npx expo prebuild --platform android --clean
        env:
          EXPO_NO_TELEMETRY: '1'

      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ runner.os }}-${{ hashFiles('android/**/*.gradle*', 'android/**/gradle-wrapper.properties') }}
          restore-keys: gradle-${{ runner.os }}-

      - name: Assemble debug APK
        working-directory: android
        run: ./gradlew assembleDebug --no-daemon --stacktrace
        env:
          EXPO_PUBLIC_DEMO_MODE: ${{ inputs.demo_mode == false && '0' || '1' }}

      - name: Name the artifact
        id: name
        run: |
          SHA=$(git rev-parse --short HEAD)
          echo "file=Foodline-Demo-${SHA}.apk" >> "$GITHUB_OUTPUT"

      - name: Rename
        run: |
          mv android/app/build/outputs/apk/debug/app-debug.apk \
             "${{ steps.name.outputs.file }}"

      - uses: actions/upload-artifact@v4
        with:
          name: foodline-apk
          path: ${{ steps.name.outputs.file }}
          retention-days: 30
          if-no-files-found: error

      # On failure, surface the Gradle report rather than making someone
      # re-run locally to find out what broke.
      - name: Upload build reports on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: gradle-reports
          path: android/app/build/reports/
          if-no-files-found: ignore
```
