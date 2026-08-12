import React, { Component, type ReactNode } from 'react';
import { useAuth, useUser, useSSO } from '@clerk/expo';

export type StartSSOFlow = ReturnType<typeof useSSO>['startSSOFlow'];

export type SafeAuthState = { isLoaded: boolean; isSignedIn: boolean };
export type SafeAuthUserState = SafeAuthState & { initial: string | null };

const SIGNED_OUT_LOADED: SafeAuthState = { isLoaded: true, isSignedIn: false };
const SIGNED_OUT_LOADED_NO_USER: SafeAuthUserState = { ...SIGNED_OUT_LOADED, initial: null };

// @clerk/shared's useAssertWrappedByClerkProvider (used internally by every
// @clerk/react hook, including useAuth()/useUser()) is a plain
// `if (!useContext(ClerkInstanceContext)) throw` — it can't tell "no
// <ClerkProvider> ancestor" apart from "<ClerkProvider> is a real ancestor,
// but its underlying clerk-js instance hasn't finished loading (or failed)
// yet". The latter is a real possibility in restrictive embedded browsers
// (e.g. Facebook's in-app WebView) where clerk-js's own script load can be
// slow, blocked, or error — normal Chrome/Safari don't hit it. Isolating the
// real hook calls in their own child fiber + local boundary means that
// failure only ever resets the reader's own state, never the hook-call
// order of whatever screen renders it.
export class ReaderBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function AuthReader({ onChange }: { onChange: (v: SafeAuthState) => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const loaded = !!isLoaded;
  const signedIn = !!isSignedIn;
  React.useEffect(() => {
    onChange({ isLoaded: loaded, isSignedIn: signedIn });
  }, [loaded, signedIn, onChange]);
  return null;
}

/**
 * Renders nothing; reports Clerk's auth state to `onChange` once available,
 * degrading to signed-out (rather than crashing the host screen) if Clerk
 * never finishes loading. Mount once per screen and keep the result in
 * local state — see app/(home)/brand/[slug].tsx for the intended usage.
 */
export function SafeAuthReader({ onChange }: { onChange: (v: SafeAuthState) => void }) {
  const onFail = React.useCallback(() => onChange(SIGNED_OUT_LOADED), [onChange]);
  return (
    <ReaderBoundary onFail={onFail}>
      <AuthReader onChange={onChange} />
    </ReaderBoundary>
  );
}

function AuthUserReader({ onChange }: { onChange: (v: SafeAuthUserState) => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const loaded = !!isLoaded;
  const signedIn = !!isSignedIn;
  const initial = user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || null;
  React.useEffect(() => {
    onChange({ isLoaded: loaded, isSignedIn: signedIn, initial });
  }, [loaded, signedIn, initial, onChange]);
  return null;
}

/** Same as SafeAuthReader, but also reports a display initial from useUser() — see components/LandingScreen.tsx. */
export function SafeAuthUserReader({ onChange }: { onChange: (v: SafeAuthUserState) => void }) {
  const onFail = React.useCallback(() => onChange(SIGNED_OUT_LOADED_NO_USER), [onChange]);
  return (
    <ReaderBoundary onFail={onFail}>
      <AuthUserReader onChange={onChange} />
    </ReaderBoundary>
  );
}

function SSOReader({ onChange }: { onChange: (fn: StartSSOFlow | null) => void }) {
  const { startSSOFlow } = useSSO();
  React.useEffect(() => {
    onChange(startSSOFlow);
  }, [startSSOFlow, onChange]);
  return null;
}

/**
 * Renders nothing; reports useSSO()'s startSSOFlow to `onChange`, or `null`
 * if Clerk never finishes loading. `onChange` is called with the bare
 * function value — if you're wiring it straight to a useState setter, wrap
 * it (`onChange={(fn) => setFlow(() => fn)}`) so React's setState doesn't
 * mistake the function for a state updater. See components/SignInPrompt.tsx.
 */
export function SafeSSOReader({ onChange }: { onChange: (fn: StartSSOFlow | null) => void }) {
  const onFail = React.useCallback(() => onChange(null), [onChange]);
  return (
    <ReaderBoundary onFail={onFail}>
      <SSOReader onChange={onChange} />
    </ReaderBoundary>
  );
}
