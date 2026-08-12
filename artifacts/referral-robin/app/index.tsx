import React, { useState } from 'react';
import { Redirect } from 'expo-router';
import { LandingScreen } from '@/components/LandingScreen';
import { SafeAuthReader, type SafeAuthState } from '@/components/SafeAuthReader';

// Mirrors the same guard as app/_layout.tsx and AuthGate: only trust a real Clerk key.
const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const hasClerk = rawKey.startsWith('pk_');

function GatedIndex() {
  // See components/SafeAuthReader.tsx — a raw useAuth() here can throw
  // instead of degrading if Clerk's underlying instance never finishes
  // loading (e.g. inside Facebook's in-app browser), crashing the whole
  // homepage for a first-time visitor. This degrades to signed-out instead.
  const [authState, setAuthState] = useState<SafeAuthState>({ isLoaded: false, isSignedIn: false });
  if (!authState.isLoaded) return <SafeAuthReader onChange={setAuthState} />;
  // Deliberately no longer redirects signed-in users away from "/" — the
  // homepage's own nav/CTAs adapt to sign-in state instead (see
  // LandingScreen), so this is also how a signed-in user gets back to the
  // marketing page at all (e.g. clicking the logo from inside the app).
  return <LandingScreen />;
}

export default function Index() {
  if (!hasClerk) return <Redirect href="/(home)/(tabs)" />;
  return <GatedIndex />;
}
