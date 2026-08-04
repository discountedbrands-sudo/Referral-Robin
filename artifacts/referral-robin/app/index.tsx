import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { LandingScreen } from '@/components/LandingScreen';

// Mirrors the same guard as app/_layout.tsx and AuthGate: only trust a real Clerk key.
const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const hasClerk = rawKey.startsWith('pk_');

function GatedIndex() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/(home)/(tabs)" />;
  return <LandingScreen />;
}

export default function Index() {
  if (!hasClerk) return <Redirect href="/(home)/(tabs)" />;
  return <GatedIndex />;
}
