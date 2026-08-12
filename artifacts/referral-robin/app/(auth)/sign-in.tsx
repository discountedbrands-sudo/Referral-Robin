import { useSignIn } from '@clerk/expo/legacy';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Text,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { ReaderBoundary, SafeSSOReader, type StartSSOFlow } from '@/components/SafeAuthReader';

WebBrowser.maybeCompleteAuthSession();

// See components/SafeAuthReader.tsx — @clerk/react's assertion can throw
// even with a real <ClerkProvider> ancestor if clerk-js hasn't finished
// loading (or failed), e.g. inside Facebook's in-app browser. Isolating the
// legacy useSignIn() hook here means that only disables this page's submit
// button (with a friendly error) instead of crashing it outright.
type SignInState = {
  isLoaded: boolean;
  signIn: ReturnType<typeof useSignIn>['signIn'] | null;
  setActive: ReturnType<typeof useSignIn>['setActive'] | null;
};
const SIGN_IN_UNAVAILABLE: SignInState = { isLoaded: true, signIn: null, setActive: null };

function SignInReader({ onChange }: { onChange: (v: SignInState) => void }) {
  const { signIn, setActive, isLoaded } = useSignIn();
  useEffect(() => {
    onChange({ isLoaded: !!isLoaded, signIn: signIn ?? null, setActive: setActive ?? null });
  }, [isLoaded, signIn, setActive, onChange]);
  return null;
}

export default function SignInPage() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  const colors = useColors();
  const [signInState, setSignInState] = useState<SignInState>({ isLoaded: false, signIn: null, setActive: null });
  const { signIn, setActive, isLoaded } = signInState;
  const [startSSOFlow, setStartSSOFlow] = useState<StartSSOFlow | null>(null);
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!isLoaded || loading) return;
    if (!signIn || !setActive) {
      setError('Sign-in isn\'t available right now — please try again in a moment.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(home)/(tabs)');
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Sign in failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    if (!startSSOFlow) {
      setError('Sign-in isn\'t available right now — please try again in a moment.');
      return;
    }
    try {
      const { createdSessionId, setActive: activate } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && activate) {
        await activate({ session: createdSessionId });
        router.replace('/(home)/(tabs)');
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Google sign in failed';
      setError(msg);
    }
  }, [startSSOFlow, router]);

  return (
    <>
      <ReaderBoundary onFail={() => setSignInState(SIGN_IN_UNAVAILABLE)}>
        <SignInReader onChange={setSignInState} />
      </ReaderBoundary>
      <SafeSSOReader onChange={(fn) => setStartSSOFlow(() => fn)} />
      <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="bird" size={32} color="#FFF" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Referral Robin</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sign in to the fair-rotation exchange
        </Text>
      </View>

      <View style={styles.form}>
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: '#3D1515', borderColor: colors.destructive }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondaryForeground }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
            autoCapitalize="none"
            value={emailAddress}
            placeholder="name@example.com"
            placeholderTextColor={colors.mutedForeground}
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondaryForeground }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
            value={password}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            onChangeText={setPassword}
            autoComplete="current-password"
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary },
            (!emailAddress || !password || loading) && { opacity: 0.5 },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSubmit}
          disabled={!emailAddress || !password || loading}
        >
          {loading
            ? <ActivityIndicator color={colors.primaryForeground} />
            : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Sign In</Text>
          }
        </Pressable>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            { borderColor: colors.border, backgroundColor: colors.card },
            pressed && { opacity: 0.8 },
            !startSSOFlow && { opacity: 0.5 },
          ]}
          onPress={handleGoogleSignIn}
          disabled={!startSSOFlow}
        >
          <MaterialCommunityIcons name="google" size={20} color={colors.foreground} />
          <Text style={[styles.googleButtonText, { color: colors.foreground }]}>Continue with Google</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={{ color: colors.mutedForeground }}>New to Referral Robin? </Text>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Create account</Text>
          </Pressable>
        </Link>
      </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
    flexWrap: 'wrap',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 2,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  googleButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
});
