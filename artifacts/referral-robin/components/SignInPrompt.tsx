import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useColors } from '@/hooks/useColors';
import { SafeSSOReader, type StartSSOFlow } from '@/components/SafeAuthReader';

WebBrowser.maybeCompleteAuthSession();

// This component is mounted unconditionally by its callers (visible or not
// — see app/(home)/brand/[slug].tsx), so a raw useSSO() call here crashes
// the *host* screen the moment it mounts, not just when the prompt opens.
// Same underlying issue as components/SafeAuthReader.tsx: @clerk/react's
// useAssertWrappedByClerkProvider can throw even with a real <ClerkProvider>
// ancestor if its clerk-js instance hasn't finished loading (or failed) —
// e.g. inside Facebook's in-app browser. SafeSSOReader isolates it so that
// only disables the Google button instead of crashing the page.

type Props = {
  visible: boolean;
  onClose: () => void;
  // Called right after a session becomes active — the reveal-gated action
  // that triggered this prompt should run from here directly rather than
  // waiting for isSignedIn to reflect the new session on next render (it
  // won't have yet in this same callback).
  onSignedIn: () => void;
};

// Shown inline over the current screen instead of navigating to a separate
// sign-in route, for any action gated on being signed in (currently just
// "Get Code") — the point is collapsing "I want this code" -> "I have this
// code" to as few taps/screens as possible. Google is the primary,
// first-shown option since it's the fastest path (no typing); email is one
// tap away as a fallback but leads to the full sign-up screen rather than
// duplicating those fields here.
export function SignInPrompt({ visible, onClose, onSignedIn }: Props) {
  const colors = useColors();
  const router = useRouter();
  const [startSSOFlow, setStartSSOFlow] = useState<StartSSOFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  useEffect(() => {
    if (visible) setError(null);
  }, [visible]);

  const handleGoogle = useCallback(async () => {
    if (!startSSOFlow) {
      setError('Sign-in isn\'t available right now — please try again in a moment.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        onSignedIn();
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Google sign in failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow, onSignedIn]);

  const handleEmailFallback = () => {
    onClose();
    router.push('/(auth)/sign-up');
  };

  return (
    <>
      <SafeSSOReader onChange={(fn) => setStartSSOFlow(() => fn)} />
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        {/* Stops the backdrop's onPress from firing when tapping inside the sheet itself. */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 36,
              gap: 16,
            }}
          >
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>
                Sign in to get this code
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>
                Free — you'll see the code right after.
              </Text>
            </View>

            {error && (
              <Text style={{ color: colors.destructive, fontSize: 13, textAlign: 'center' }}>{error}</Text>
            )}

            <Pressable
              onPress={handleGoogle}
              disabled={loading || !startSSOFlow}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                backgroundColor: colors.card,
                opacity: pressed || loading ? 0.8 : 1,
              })}
            >
              {loading ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <>
                  <MaterialCommunityIcons name="google" size={20} color={colors.foreground} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            <Pressable
              onPress={handleEmailFallback}
              style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>
                Continue with email
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
      </Modal>
    </>
  );
}
