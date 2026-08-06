import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/expo';
import { useColors } from '@/hooks/useColors';
import { useListBrands } from '@workspace/api-client-react';

const STEPS = [
  {
    title: "Pick what you're after",
    body: 'Banking, insurance, gyms, and more, all in one place.',
  },
  {
    title: 'Reveal your code',
    body: 'One tap, copy, done.',
  },
  {
    title: 'It rotates on',
    body: "That code steps back so the next person gets a turn. Ten minutes later, it's back in the mix.",
  },
];

const CONTENT_MAX_WIDTH = 1080;
const WIDE_BREAKPOINT = 860;

export function LandingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  // onLayout's `layout.y` is relative to the *immediate parent*, not to the
  // ScrollView's content origin. The "what's on offer" intro is nested
  // inside its own maxWidth wrapper (the 3rd of 3 top-level siblings under
  // the ScrollView), so its own onLayout y was ~0 regardless of true scroll
  // position — scrollToGrid was scrolling to ~0, a no-op from the top.
  // Fix: also track the two preceding top-level sections' heights (their
  // onLayout IS relative to the ScrollView, since they're direct children of
  // it) and sum all three for the real target offset.
  const [heroStepsHeight, setHeroStepsHeight] = useState(0);
  const [whyBandHeight, setWhyBandHeight] = useState(0);
  const [gridIntroOffset, setGridIntroOffset] = useState(0);
  const gridY = heroStepsHeight + whyBandHeight + gridIntroOffset;
  const { data: brands = [], isLoading } = useListBrands({});

  // This screen renders at "/" for signed-in users too now (no more forced
  // redirect away from it — see app/index.tsx), so it's also how a signed-in
  // user gets back to the marketing page at all. Nav/CTAs adapt accordingly
  // instead of assuming a signed-out visitor.
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const initial = (user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || '?').toUpperCase();

  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWide = isWeb && width >= WIDE_BREAKPOINT;
  // Below this, logo+wordmark and the sign-in/sign-up (or avatar) controls
  // don't fit on one row without wrapping — the nav has no wrap fallback,
  // so it clips instead. Condense rather than add wrapping (wrapping a
  // justify-space-between row reads oddly with items on the wrong line).
  const isNarrowNav = isWeb && width < 400;

  // On web, size the grid to the viewport (more columns as it gets wider);
  // on native, stay with the original fixed 3-across layout.
  const gridColumns = isWeb ? Math.max(3, Math.min(6, Math.floor(width / 190))) : 3;
  const gridGap = 14;
  // Leave a couple points of slack off the even split so `gap` has room —
  // percentage widths in RN flexbox aren't gap-aware (same trick the
  // original 3-column '31%' layout relied on).
  const cardWidthPct = `${100 / gridColumns - 2}%` as `${number}%`;

  const hPad = isWide ? 0 : 24;

  const scrollToGrid = () => {
    scrollRef.current?.scrollTo({ y: Math.max(gridY - 16, 0), animated: true });
  };

  const Logo = ({ name }: { name: string }) => (
    <View
      style={{
        width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Feather name="repeat" size={18} color="#fff" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isWeb && (
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.08)',
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: CONTENT_MAX_WIDTH,
              width: '100%',
              alignSelf: 'center',
              paddingHorizontal: isNarrowNav ? 12 : 24,
              paddingVertical: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Logo name="repeat" />
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Referral Robin</Text>
            </View>

            {isWide && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32 }}>
                {/* Signed-in: straight to the real Explore screen — no reason
                    to show the static preview grid when the functional one
                    is one tap away. Signed-out: scroll to the preview, same
                    as before (matches the hero CTA's same distinction). */}
                <Pressable onPress={() => (isSignedIn ? router.push('/(home)/(tabs)') : scrollToGrid())}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 14, fontWeight: '600' }}>Browse brands</Text>
                </Pressable>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {isSignedIn ? (
                <>
                  <Pressable
                    onPress={() => router.push('/(home)/(tabs)')}
                    style={({ pressed }) => ({
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                      paddingVertical: 9,
                      paddingHorizontal: isNarrowNav ? 12 : 16,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Go to app</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/(home)/(tabs)/account')}
                    style={{
                      width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{initial}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Dropped below ~400px — not enough room for logo + wordmark +
                      "Sign in" + the sign-up pill on one row, and this row has
                      no wrap fallback. The pill alone is the one action that
                      actually needs to survive at any width. */}
                  {!isNarrowNav && (
                    <Pressable onPress={() => router.push('/(auth)/sign-in')} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>Sign in</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => router.push('/(auth)/sign-up')}
                    style={({ pressed }) => ({
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                      paddingVertical: 9,
                      paddingHorizontal: isNarrowNav ? 12 : 16,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Sign up free</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View
          onLayout={(e) => setHeroStepsHeight(e.nativeEvent.layout.height)}
          style={{ maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }}
        >
          {/* Hero */}
          <View
            style={{
              paddingHorizontal: hPad + 24,
              paddingTop: isWeb ? 72 : insets.top + 48,
              paddingBottom: isWide ? 64 : 40,
              gap: 16,
              alignItems: isWide ? 'center' : 'stretch',
            }}
          >
            {!isWeb && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Logo name="repeat" />
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>Referral Robin</Text>
              </View>
            )}

            <View style={{ maxWidth: isWide ? 720 : undefined, alignItems: isWide ? 'center' : 'stretch', gap: 16 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: isWide ? 52 : 36,
                  fontWeight: '800',
                  lineHeight: isWide ? 58 : 42,
                  textAlign: isWide ? 'center' : 'left',
                }}
              >
                Get referral codes. Fairly.
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: isWide ? 18 : 16,
                  lineHeight: isWide ? 28 : 24,
                  textAlign: isWide ? 'center' : 'left',
                  maxWidth: isWide ? 620 : undefined,
                }}
              >
                Banks, apps, insurance, gyms — hundreds of companies give real rewards for referrals. Referral
                Robin rotates real codes from real people, so everyone gets a fair turn. No spam, no dead
                links, no one hogging the queue.
              </Text>

              <View
                style={{
                  flexDirection: isWide ? 'row' : 'column',
                  gap: 10,
                  marginTop: 8,
                  alignItems: 'center',
                }}
              >
                <Pressable
                  onPress={() => router.push(isSignedIn ? '/(home)/(tabs)' : '/(auth)/sign-up')}
                  style={({ pressed }) => ({
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: isWide ? 28 : undefined,
                    alignItems: 'center',
                    opacity: pressed ? 0.85 : 1,
                    width: isWide ? undefined : '100%',
                  })}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                    {isSignedIn ? 'Go to Explore' : 'Sign up free'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => router.push('/(home)/(tabs)')} style={{ alignItems: 'center', paddingVertical: 10, paddingHorizontal: isWide ? 12 : 0 }}>
                  <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '600' }}>
                    {isSignedIn ? 'Browse brands →' : 'Browse without an account →'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* How it works */}
          <View
            style={{
              paddingHorizontal: hPad + 24,
              paddingBottom: isWide ? 64 : 44,
              flexDirection: isWide ? 'row' : 'column',
              gap: isWide ? 32 : 18,
            }}
          >
            {STEPS.map((step, i) => (
              <View
                key={step.title}
                style={{
                  flex: isWide ? 1 : undefined,
                  flexDirection: isWide ? 'column' : 'row',
                  gap: isWide ? 12 : 14,
                  alignItems: isWide ? 'flex-start' : 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
                  }}
                >
                  <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: isWide ? 6 : 2 }}>
                  <Text style={{ color: colors.foreground, fontSize: isWide ? 17 : 15, fontWeight: '700' }}>{step.title}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: isWide ? 15 : 14, lineHeight: isWide ? 22 : 20 }}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Why Round Robin — full-bleed band, centered inner column */}
        <View
          onLayout={(e) => setWhyBandHeight(e.nativeEvent.layout.height)}
          style={{ backgroundColor: colors.muted, paddingVertical: isWide ? 56 : 32 }}
        >
          <View
            style={{
              maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center',
              paddingHorizontal: hPad + 24, gap: 12,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: isWide ? 28 : 22, fontWeight: '800' }}>Why "Round Robin"?</Text>
            <View style={{ maxWidth: isWide ? 720 : undefined, gap: 12 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: isWide ? 16 : 14, lineHeight: isWide ? 26 : 22 }}>
                Back in the 1600s, sailors used to sign petitions in a circle — so nobody could tell who'd
                signed first and copped the blame as ringleader. Fast forward a few centuries and the same
                idea gave us round-robin tournaments, where everyone gets a fair turn instead of one player
                hogging the game.
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: isWide ? 16 : 14, lineHeight: isWide ? 26 : 22 }}>
                We borrowed the same idea for referral codes — everyone gets a fair go, nobody hogs the queue.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }}>
          {/* Category showcase intro */}
          <View
            onLayout={(e) => setGridIntroOffset(e.nativeEvent.layout.y)}
            style={{ paddingHorizontal: hPad + 24, paddingTop: isWide ? 56 : 36, paddingBottom: 8, gap: 6 }}
          >
            <Text style={{ color: colors.foreground, fontSize: isWide ? 28 : 22, fontWeight: '800' }}>
              What's on offer right now
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: isWide ? 15 : 14, lineHeight: 20 }}>
              A live look at what's rotating today. Sign up to actually claim one.
            </Text>
          </View>

          {/* Brand grid preview */}
          <View style={{ paddingHorizontal: hPad + 24, paddingTop: 16 }}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }}>
                {brands.slice(0, isWeb ? gridColumns * 2 : 9).map((brand: any) => (
                  <View
                    key={brand.id}
                    style={{
                      width: cardWidthPct,
                      backgroundColor: colors.muted,
                      borderRadius: 14,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
                      padding: isWide ? 16 : 10, alignItems: 'center', gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: isWide ? 44 : 36, height: isWide ? 44 : 36, borderRadius: 8, backgroundColor: '#FFFFFF',
                        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      }}
                    >
                      {brand.logoUrl ? (
                        <Image source={{ uri: brand.logoUrl }} style={{ width: isWide ? 34 : 28, height: isWide ? 34 : 28 }} resizeMode="contain" />
                      ) : (
                        <Text style={{ fontSize: 14, fontWeight: '700' }}>{brand.name?.charAt(0)}</Text>
                      )}
                    </View>
                    <Text
                      style={{ color: colors.foreground, fontSize: isWide ? 13 : 11, fontWeight: '600', textAlign: 'center' }}
                      numberOfLines={1}
                    >
                      {brand.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Trust line */}
          <View style={{ paddingHorizontal: hPad + 24, paddingTop: 32, paddingBottom: 8 }}>
            <Text
              style={{
                color: colors.mutedForeground, fontSize: 13, lineHeight: 20, textAlign: 'center',
                maxWidth: isWide ? 620 : undefined, alignSelf: 'center',
              }}
            >
              Every code here comes from a real person who's actually used the service. We don't publish
              codes publicly — they're only ever revealed once you're signed in.
            </Text>
          </View>

          {/* Footer CTA */}
          <View style={{ paddingHorizontal: hPad + 24, paddingTop: 36, paddingBottom: isWide ? 24 : 0, alignItems: 'center', gap: 16 }}>
            <Text style={{ color: colors.foreground, fontSize: isWide ? 26 : 20, fontWeight: '800', textAlign: 'center' }}>
              {isSignedIn ? 'Ready to see what\'s rotating?' : 'Ready to stop missing out on referral rewards?'}
            </Text>
            <Pressable
              onPress={() => router.push(isSignedIn ? '/(home)/(tabs)' : '/(auth)/sign-up')}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 28,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {isSignedIn ? 'Go to Explore' : 'Create your free account'}
              </Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 20 }}>
              <Pressable onPress={() => router.push('/privacy')} style={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Privacy Policy</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/terms')} style={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Terms of Service</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
