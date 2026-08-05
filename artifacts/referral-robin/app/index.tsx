import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { LandingScreen } from '@/components/LandingScreen';

// Mirrors the same guard as app/_layout.tsx and AuthGate: only trust a real Clerk key.
const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const hasClerk = rawKey.startsWith('pk_');

function GatedIndex() {
  const { isLoaded } = useAuth();
  if (!isLoaded) return null;
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
