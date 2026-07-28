---
name: iOS-only package crash on web
description: Packages that fail on web/Android due to missing native build files
---

## Rule
Never import `expo-glass-effect`, `expo-symbols`, or `expo-router/unstable-native-tabs` at module level in shared route files. They lack web/Android native build files and crash on those platforms.

**Why:** These packages have native-only implementations with no web shim.

**How to apply:** Guard with `Platform.OS === 'ios'` and dynamic imports if needed on iOS-only screens. Never in `_layout.tsx` or shared layouts.
