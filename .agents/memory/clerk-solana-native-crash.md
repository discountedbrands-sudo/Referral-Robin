---
name: Clerk pulls in Solana native module — crashes New Architecture release builds
description: @clerk/expo transitively depends on @solana-mobile/mobile-wallet-adapter-protocol which crashes on Android New Architecture release builds
---

## Rule
Always exclude all `@solana-mobile/*` packages from Expo autolinking in any project using `@clerk/expo`.

**Why:** `@clerk/expo` → `@clerk/clerk-js` → `@solana/wallet-adapter-react` → `@solana-mobile/wallet-adapter-mobile` → `@solana-mobile/mobile-wallet-adapter-protocol`. This native Android module uses the deprecated `TurboReactPackage` API, which crashes immediately on launch in release builds with New Architecture enabled. The app never shows anything — it exits straight away.

**How to apply:** Add to the app's `package.json`:
```json
"expo": {
  "autolinking": {
    "exclude": [
      "@solana-mobile/mobile-wallet-adapter-protocol",
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js",
      "@solana-mobile/wallet-standard-mobile",
      "@solana-mobile/wallet-adapter-mobile"
    ]
  }
}
```
This tells expo-autolinking to skip these packages so they are never registered as Android native modules.
