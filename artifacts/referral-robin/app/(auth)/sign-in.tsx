import { useSignIn, useSSO } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Text,
  Platform,
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

function navigateAfterAuth(url: string, router: ReturnType<typeof useRouter>) {
  if (url.startsWith('http')) {
    // Web — Expo Router can't handle absolute URLs; use location directly
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  } else {
    router.replace(url as Href);
  }
}

export default function SignInPage() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  const colors = useColors();
  const { signIn, errors, fetchStatus, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = async () => {
    if (!isLoaded) return;
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return; // errors object updates automatically — shown in UI below

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          navigateAfterAuth(decorateUrl('/(home)/(tabs)/'), router);
        },
      });
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) return;
            navigateAfterAuth(decorateUrl('/(home)/(tabs)/'), router);
          },
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, [startSSOFlow, router]);

  // Flatten all Clerk field errors into a single message for display
  const errorMessage = (() => {
    if (!errors) return null;
    const fieldErrors = Object.values(errors.fields ?? {})
      .map((f: any) => f?.message)
      .filter(Boolean);
    if (fieldErrors.length > 0) return fieldErrors.join(' · ');
    if ((errors as any).message) return (errors as any).message;
    return null;
  })();

  return (
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
        {/* Error banner */}
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: '#3D1515', borderColor: colors.destructive }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondaryForeground }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.input, borderColor: errors?.fields?.emailAddress ? colors.destructive : colors.border, color: colors.foreground },
            ]}
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
            style={[
              styles.input,
              { backgroundColor: colors.input, borderColor: errors?.fields?.password ? colors.destructive : colors.border, color: colors.foreground },
            ]}
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
            (!emailAddress || !password || fetchStatus === 'fetching') && { opacity: 0.5 },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSubmit}
          disabled={!emailAddress || !password || fetchStatus === 'fetching'}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {fetchStatus === 'fetching' ? 'Signing in…' : 'Sign In'}
          </Text>
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
          ]}
          onPress={handleGoogleSignIn}
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
