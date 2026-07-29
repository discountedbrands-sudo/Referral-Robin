---
name: Clerk publishableKey crash — env var not set in Codemagic
description: If EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not defined in Codemagic env vars, the codemagic.yaml expansion leaves the literal string "$EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" which is truthy, bypasses the !publishableKey guard, and causes a ClerkProvider crash.
---

## Rule
Always validate a Clerk publishable key starts with `pk_` before rendering ClerkProvider. An `|| ''` fallback is not enough because an unexpanded shell placeholder is a non-empty string.

**Why:** In Codemagic, `vars: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: $EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` leaves the literal string `"$EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"` if the Codemagic env var is not defined in their dashboard. Metro inlines this string into the JS bundle. `!publishableKey` is false, ClerkProvider renders with an invalid key, and `@clerk/clerk-js` throws `throwInvalidPublishableKeyError` crashing the `mqt_v_native` thread.

**How to apply:**
```js
const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const publishableKey = rawKey.startsWith('pk_') ? rawKey : '';
if (!publishableKey) { /* skip ClerkProvider */ }
```

Also ensure the Codemagic project has `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` set in Environment Variables → Global or the specific workflow group.
