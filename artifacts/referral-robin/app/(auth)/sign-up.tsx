import { useSignUp, useAuth } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function navigateAfterAuth(url: string, router: ReturnType<typeof useRouter>) {
  if (url.startsWith('http')) {
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  } else {
    router.replace(url as Href);
  }
}

export default function SignUpPage() {
  const colors = useColors();
  const { signUp, errors, fetchStatus, isLoaded } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');

  const handleSubmit = async () => {
    if (!isLoaded) return;
    const { error } = await signUp.password({ emailAddress, password });
    if (error) return; // errors object updates automatically — shown in UI below
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          navigateAfterAuth(decorateUrl('/(home)/(tabs)/'), router);
        },
      });
    }
  };

  if (signUp?.status === 'complete' || isSignedIn) return null;

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

  // Email verification step
  if (
    signUp?.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  ) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="email-check-outline" size={32} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: 'center' }]}>
            We sent a 6-digit code to{'\n'}{emailAddress}
          </Text>
        </View>

        <View style={styles.form}>
          {errorMessage ? (
            <View style={[styles.errorBanner, { backgroundColor: '#3D1515', borderColor: colors.destructive }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{errorMessage}</Text>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, styles.codeInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
            value={code}
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary },
              (!code || fetchStatus === 'fetching') && { opacity: 0.5 },
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleVerify}
            disabled={!code || fetchStatus === 'fetching'}
          >
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
              {fetchStatus === 'fetching' ? 'Verifying…' : 'Verify Account'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.ghostButton, pressed && { opacity: 0.6 }]}
            onPress={() => signUp.verifications.sendEmailCode()}
          >
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Resend code</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="bird" size={32} color="#FFF" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Join the fair-rotation exchange
        </Text>
      </View>

      <View style={styles.form}>
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: '#3D1515', borderColor: colors.destructive }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondaryForeground }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, borderColor: errors?.fields?.emailAddress ? colors.destructive : colors.border, color: colors.foreground }]}
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
            style={[styles.input, { backgroundColor: colors.input, borderColor: errors?.fields?.password ? colors.destructive : colors.border, color: colors.foreground }]}
            value={password}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            onChangeText={setPassword}
            autoComplete="new-password"
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
            {fetchStatus === 'fetching' ? 'Creating account…' : 'Sign Up'}
          </Text>
        </Pressable>

        {/* Required for Clerk bot protection */}
        <View nativeID="clerk-captcha" />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: colors.mutedForeground }}>Already have an account? </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign in</Text>
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
  codeInput: {
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 10,
    height: 64,
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
  ghostButton: {
    alignItems: 'center',
    padding: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
});
