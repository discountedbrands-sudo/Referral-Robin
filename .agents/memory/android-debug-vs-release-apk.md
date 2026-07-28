---
name: Android debug vs release APK — JS bundling
description: assembleDebug does NOT bundle JS; app hangs on splash waiting for Metro dev server
---

## Rule
Always use `assembleRelease` (not `assembleDebug`) for test APKs intended to run on a real device without a dev server.

**Why:** `assembleDebug` produces an APK that loads JS from a Metro packager at runtime. Without a running packager on the same network, the app hangs indefinitely — the Expo splash screen stays visible because `SplashScreen.hideAsync()` is never called (JS never executes). This looks exactly like a JS-level hang but is actually a build configuration issue.

**How to apply:** For Codemagic (or any CI) preview builds, use:
```
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=$HOME/.android/debug.keystore \
  -Pandroid.injected.signing.store.password=android \
  -Pandroid.injected.signing.key.alias=androiddebugkey \
  -Pandroid.injected.signing.key.password=android
```
Android's debug keystore is pre-installed on all dev machines and Codemagic agents. Release builds always bundle JS into the APK and need no packager.
