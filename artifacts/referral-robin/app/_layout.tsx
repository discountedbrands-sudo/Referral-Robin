import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { DeviceProvider } from '@/context/DeviceContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (apiUrl) setBaseUrl(apiUrl);
else if (domain) setBaseUrl(`https://${domain}`);

// Guard: Clerk publishable keys always start with "pk_". If the env var is
// missing or Codemagic left the placeholder unexpanded, skip ClerkProvider.
const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const publishableKey = rawKey.startsWith('pk_') ? rawKey : '';
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

// Registers Clerk's session token with the API client so every request
// carries `Authorization: Bearer <token>`. Only mounted inside ClerkProvider
// (see RootLayout) — useAuth() throws without one.
function ApiAuthSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(getToken);
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}

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
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!publishableKey) {
    return <AppShell />;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
      <ApiAuthSync />
      <AppShell />
    </ClerkProvider>
  );
}
