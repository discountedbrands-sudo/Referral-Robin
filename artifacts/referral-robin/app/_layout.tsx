import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Stack, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { DeviceProvider } from '@/context/DeviceContext';
import { SITE_URL, DEFAULT_TITLE, DEFAULT_DESCRIPTION, OG_IMAGE, API_BASE_URL } from '@/constants/seo';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const domain = process.env.EXPO_PUBLIC_DOMAIN;
// Falls back to the known production API host so static export (which runs
// in a plain Node context, not a deployed request) still has a working
// absolute base URL even if neither env var is set in the build environment.
if (apiUrl) setBaseUrl(apiUrl);
else if (domain) setBaseUrl(`https://${domain}`);
else setBaseUrl(API_BASE_URL);

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

// Site-wide default title/description/OG/Twitter tags. Rendered for every
// route (this lives in the root layout), so page-level `<Head>` overrides
// (LegalPage, brand/[brandId]) replace individual tags via React Helmet's
// merge rules instead of stacking duplicate <title>/<meta> tags alongside
// these. Only takes effect in the raw HTML when `web.output: "static"` is
// set — see app/+html.tsx.
function SiteHead() {
  const pathname = usePathname();
  if (Platform.OS !== 'web') return null;
  const canonicalUrl = `${SITE_URL}${pathname === '/' ? '' : pathname}`;
  return (
    <Head>
      <title>{DEFAULT_TITLE}</title>
      <meta name="description" content={DEFAULT_DESCRIPTION} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Referral Robin" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={DEFAULT_TITLE} />
      <meta property="og:description" content={DEFAULT_DESCRIPTION} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={DEFAULT_TITLE} />
      <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
      <meta name="twitter:image" content={OG_IMAGE} />
    </Head>
  );
}

function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <DeviceProvider>
          <ErrorBoundary>
            <SiteHead />
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
