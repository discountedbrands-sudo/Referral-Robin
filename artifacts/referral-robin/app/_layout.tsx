import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setBaseUrl } from '@workspace/api-client-react';
import { DeviceProvider } from '@/context/DeviceContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// EXPO_PUBLIC_API_URL is set in eas.json for EAS builds (points to deployed API).
// EXPO_PUBLIC_DOMAIN is the Replit dev domain used in local dev.
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (apiUrl) setBaseUrl(apiUrl);
else if (domain) setBaseUrl(`https://${domain}`);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <DeviceProvider>
          <ErrorBoundary>
            {Platform.OS === 'web' ? (
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F1117' } }} />
            ) : (
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F1117' }}>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F1117' } }} />
              </GestureHandlerRootView>
            )}
          </ErrorBoundary>
        </DeviceProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      return;
    }
    // Safety net: never hang forever if font loading stalls silently
    const t = setTimeout(() => SplashScreen.hideAsync(), 3000);
    return () => clearTimeout(t);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  // If no Clerk key is baked in (e.g. a test APK build), skip auth entirely.
  if (!publishableKey) {
    return <AppShell />;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
      <AppShell />
    </ClerkProvider>
  );
}
