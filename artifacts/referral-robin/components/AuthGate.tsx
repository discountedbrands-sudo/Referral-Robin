import React, { type ReactNode } from 'react';
import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';

// Mirrors the same guard as app/_layout.tsx: only trust a real Clerk key.
const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const hasClerk = rawKey.startsWith('pk_');

type AuthGateProps = {
  /** Redirect here when the user is signed out. Use to protect a route group. */
  whenSignedOut?: string;
  /** Redirect here when the user is signed in. Use on the sign-in/sign-up group. */
  whenSignedIn?: string;
  children: ReactNode;
};

function ClerkAuthGate({ whenSignedOut, whenSignedIn, children }: AuthGateProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (whenSignedOut && !isSignedIn) return <Redirect href={whenSignedOut as any} />;
  if (whenSignedIn && isSignedIn) return <Redirect href={whenSignedIn as any} />;
  return <>{children}</>;
}

// When Clerk isn't configured (see app/_layout.tsx), there's no ClerkProvider
// ancestor, so useAuth() would throw. Render ungated in that case, same as
// today, instead of crashing.
export function AuthGate(props: AuthGateProps) {
  if (!hasClerk) return <>{props.children}</>;
  return <ClerkAuthGate {...props} />;
}
