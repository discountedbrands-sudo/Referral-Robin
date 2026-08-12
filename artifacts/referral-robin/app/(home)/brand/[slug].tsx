import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useColors } from '@/hooks/useColors';
import { useGetBrand, useGetCooldown, useGetNextCode, useConfirmCopy, useReportCode, getGetBrandQueryKey, getGetCooldownQueryKey } from '@workspace/api-client-react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDevice } from '@/context/DeviceContext';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { API_BASE_URL, SITE_URL, OG_IMAGE } from '@/constants/seo';
import { SignInPrompt } from '@/components/SignInPrompt';
import { SafeAuthReader, type SafeAuthState } from '@/components/SafeAuthReader';

// Static export (web.output: "static") pre-renders one real HTML file per
// slug returned here — but only the slugs, not any other data: Expo
// Router's static renderer resets global/module state between pages and
// never awaits this component's own async data fetch (useGetBrand below),
// so the actual per-brand title/description/OG values can't reach the raw
// HTML from here. scripts/inject-brand-seo.mjs rewrites those tags into
// each generated dist/brand/{slug}.html after `expo export` using the same
// brand list, which is what actually fixes it for social link-preview bots
// (they don't run JS, so this component's own <Head> below only ever helps
// browser tab titles + JS-executing crawlers). Slugs not covered here
// (brands added after the last deploy) fall back to the generic
// `[slug].html` shell; see vercel.json's rewrite for that.
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/brands`);
    if (!res.ok) return [];
    const brands: { slug: string; active: boolean }[] = await res.json();
    return brands.filter((b) => b.active).map((b) => ({ slug: b.slug }));
  } catch {
    return [];
  }
}

export default function BrandRevealScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const deviceId = useDevice();
  // See components/SafeAuthReader.tsx — a raw useAuth() here can throw
  // instead of degrading if Clerk's underlying instance never finishes
  // loading (e.g. inside Facebook's in-app browser), crashing this
  // otherwise-public page. This degrades to signed-out instead.
  const [authState, setAuthState] = useState<SafeAuthState>({ isLoaded: false, isSignedIn: false });
  const { isSignedIn } = authState;

  const [revealedCode, setRevealedCode] = useState<{ id: number; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Queries
  const { data: brand, isLoading: isBrandLoading } = useGetBrand(slug, { query: { queryKey: getGetBrandQueryKey(slug), enabled: !!slug } });

  // brand.id (the internal numeric FK codes/cooldowns key off) is only
  // known once `brand` has loaded — this query stays disabled until then.
  const { data: cooldownData, refetch: refetchCooldown } = useGetCooldown(
    { brandId: brand?.id ?? 0, deviceId: deviceId || '' },
    { query: { queryKey: getGetCooldownQueryKey({ brandId: brand?.id ?? 0, deviceId: deviceId || '' }), enabled: !!brand?.id && !!deviceId } }
  );

  // Mutations
  const getNextCode = useGetNextCode();
  const confirmCopy = useConfirmCopy();
  const reportCode = useReportCode();

  // Cooldown countdown state
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (cooldownData?.isOnCooldown && cooldownData.remainingSeconds) {
      setTimeLeft(cooldownData.remainingSeconds);
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            refetchCooldown();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
    }
  }, [cooldownData, refetchCooldown]);

  // The actual reveal call, split out from the isSignedIn gate below so the
  // sign-in prompt's onSignedIn can call it directly right after a session
  // becomes active — isSignedIn from useAuth() won't reflect that yet in
  // the same callback (updates on the next render), so re-running
  // handleGetCode immediately after sign-in would just re-open the prompt.
  const revealCode = () => {
    if (!deviceId || !brand) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    getNextCode.mutate({ data: { brandId: brand.id, deviceId } }, {
      onSuccess: (data) => {
        setRevealedCode({ id: data.codeId, code: data.code });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetchCooldown();
      },
      onError: (err: any) => {
        // Alert.alert() is a no-op on react-native-web; fall back to window.alert.
        if (err?.status === 401) {
          setShowSignInPrompt(true);
        } else if (err?.data?.error === 'CooldownError') {
          if (Platform.OS === 'web') window.alert('You are on cooldown for this brand.');
          else Alert.alert("Hold on", "You are on cooldown for this brand.");
          refetchCooldown();
        } else {
          const message = err?.data?.error || "Failed to get code.";
          if (Platform.OS === 'web') window.alert(message);
          else Alert.alert("Error", message);
        }
      }
    });
  };

  const handleGetCode = () => {
    if (!deviceId || !brand) return;

    // Browsing brands is public, but revealing a real code isn't — this mirrors
    // the requireAuth check the server enforces on POST /codes/next. This
    // client-side check is just UX (skip the round trip, send a clear prompt);
    // the actual security boundary is the server rejecting an unauthenticated
    // request with 401, handled above as a fallback in case this state is stale.
    if (!isSignedIn) {
      setShowSignInPrompt(true);
      return;
    }

    revealCode();
  };

  const handleCopy = async () => {
    if (!revealedCode || !deviceId) return;
    await Clipboard.setStringAsync(revealedCode.code);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    confirmCopy.mutate({ data: { codeId: revealedCode.id, deviceId } });
    
    setTimeout(() => setCopied(false), 3000);
  };

  const submitReport = () => {
    if (!revealedCode || !deviceId) return;
    reportCode.mutate({ codeId: revealedCode.id, data: { deviceId } }, {
      onSuccess: () => {
        // Alert.alert() is a no-op on react-native-web; fall back to window.alert.
        if (Platform.OS === 'web') window.alert('Thanks — code reported. It will be reviewed.');
        else Alert.alert("Thanks", "Code reported. It will be reviewed.");
        setRevealedCode(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (err: any) => {
        // Reaching this screen's report button already implies a signed-in
        // reveal happened (see handleGetCode), but the session could have
        // lapsed since — fall back the same way as getNextCode's 401 case.
        if (err?.status === 401) router.push('/(auth)/sign-in');
      },
    });
  };

  const handleReport = () => {
    if (!revealedCode || !deviceId) return;
    // Alert.alert() with buttons is a no-op on react-native-web (its onPress
    // callbacks never fire there); fall back to window.confirm.
    if (Platform.OS === 'web') {
      if (window.confirm('Is this code invalid or expired?')) submitReport();
      return;
    }
    Alert.alert(
      "Report Code",
      "Is this code invalid or expired?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Report", style: "destructive", onPress: submitReport },
      ]
    );
  };

  // Client-side only (see the generateStaticParams comment above for why
  // this can't reach the raw static HTML) — still worth setting for the
  // browser tab title and for crawlers that do execute JS.
  const seoHead = brand && Platform.OS === 'web' && (() => {
    const pageTitle = `${brand.name} referral code – Referral Robin`;
    const pageDescription =
      brand.currentOffer || `Get a ${brand.name} referral code, fairly rotated from real people on Referral Robin.`;
    const pageUrl = `${SITE_URL}/brand/${slug}`;
    return (
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={brand.logoUrl || OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={brand.logoUrl || OG_IMAGE} />
      </Head>
    );
  })();

  if (isBrandLoading) {
    return (
      <>
        {seoHead}
        <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (!brand) return seoHead || null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isOnCooldown = timeLeft > 0;

  // Some brands' "codes" are actually referral links. Rendering a long URL
  // at the same large, letter-spaced size as a short code wraps badly and
  // breaks the card's layout — show just the domain (or nothing) instead,
  // and let the button do the work.
  let linkDomain: string | null = null;
  if (revealedCode) {
    try {
      linkDomain = new URL(revealedCode.code).hostname.replace(/^www\./, '');
    } catch {
      linkDomain = null;
    }
  }
  const isLink = linkDomain !== null;

  return (
    <>
      {seoHead}
      <SafeAuthReader onChange={setAuthState} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{brand.name}</Text>
        <View style={styles.backButton} /> {/* Spacer */}
      </View>

      <View style={styles.content}>
        <View style={styles.brandInfo}>
          {brand.currentOffer && (
            <View style={styles.offerBox}>
              <MaterialCommunityIcons name="gift" size={32} color={colors.accent} />
              <Text style={[styles.offerTitle, { color: colors.foreground }]}>Current Offer</Text>
              <Text style={[styles.offerText, { color: colors.accent }]}>{brand.currentOffer}</Text>
            </View>
          )}
        </View>

        {!revealedCode ? (
          <View style={styles.actionSection}>
            <View style={[styles.infoCard, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={20} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                We will serve you one random code from the queue. You can copy it and use it right away.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.mainButton,
                { backgroundColor: isOnCooldown ? colors.muted : colors.primary },
                pressed && !isOnCooldown && { opacity: 0.8 },
                (isOnCooldown || getNextCode.isPending) && { opacity: 0.6 }
              ]}
              onPress={handleGetCode}
              disabled={isOnCooldown || getNextCode.isPending}
            >
              {getNextCode.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : isOnCooldown ? (
                <Text style={[styles.mainButtonText, { color: colors.mutedForeground }]}>
                  Cooldown: {formatTime(timeLeft)}
                </Text>
              ) : (
                <Text style={[styles.mainButtonText, { color: colors.primaryForeground }]}>
                  {isSignedIn ? 'Get Code' : 'Sign in to get code'}
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.revealSection}>
            <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.codeLabel, { color: colors.secondaryForeground }]}>
                {isLink ? 'Your Referral Link' : 'Your Referral Code'}
              </Text>
              {isLink ? (
                <Text style={[styles.linkDomainText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {linkDomain}
                </Text>
              ) : (
                <Text style={[styles.revealedCodeText, { color: colors.foreground }]} selectable>
                  {revealedCode.code}
                </Text>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.copyButton,
                  { backgroundColor: copied ? '#4ade80' : colors.primary },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleCopy}
              >
                <Feather name={copied ? "check" : isLink ? "link-2" : "copy"} size={20} color={colors.primaryForeground} />
                <Text style={[styles.copyButtonText, { color: colors.primaryForeground }]}>
                  {copied ? "Copied!" : isLink ? "Copy Link" : "Copy Code"}
                </Text>
              </Pressable>
            </View>

            <Pressable style={styles.reportButton} onPress={handleReport}>
              <Feather name="flag" size={16} color={colors.mutedForeground} />
              <Text style={[styles.reportText, { color: colors.mutedForeground }]}>Report invalid code</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
    <SignInPrompt
      visible={showSignInPrompt}
      onClose={() => setShowSignInPrompt(false)}
      onSignedIn={() => {
        setShowSignInPrompt(false);
        revealCode();
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 40,
  },
  brandInfo: {
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  offerBox: {
    alignItems: 'center',
    gap: 8,
  },
  offerTitle: {
    fontSize: 18,
  },
  offerText: {
    fontSize: 16,
    textAlign: 'center',
  },
  actionSection: {
    gap: 24,
    marginTop: 'auto',
    marginBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  mainButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainButtonText: {
    fontSize: 18,
  },
  revealSection: {
    gap: 24,
    marginTop: 'auto',
    marginBottom: 40,
  },
  codeCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 20,
  },
  codeLabel: {
    fontSize: 14,
  },
  revealedCodeText: {
    fontSize: 32,
    letterSpacing: 2,
    textAlign: 'center',
  },
  linkDomainText: {
    fontSize: 16,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  copyButtonText: {
    fontSize: 16,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  reportText: {
    fontSize: 14,
  },
});
