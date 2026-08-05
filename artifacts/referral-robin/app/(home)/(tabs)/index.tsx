import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListBrands } from '@workspace/api-client-react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  'All',
  'Banking & Fintech',
  'Investing & Crypto',
  'Insurance',
  'Gyms & Fitness',
  'Medical & Weight Loss',
  'Utilities',
  'EV Charging',
  'Retail & Cashback',
  'Software & Apps',
  'Travel & Money Transfer',
];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError } = useListBrands({
    search: search.trim() || undefined,
    category: category === 'All' ? undefined : category,
  });
  // Guard against a malformed/non-array response (e.g. an error page or
  // unexpected payload shape) so rendering falls back to an empty state
  // instead of crashing on .length/.slice/.map below.
  const brands: any[] = Array.isArray(data) ? data : [];

  // Fixed-size backing box for every logo — real logo images vary wildly in
  // built-in padding/background (some are full-bleed colour squares, some
  // are transparent marks), so without a uniform container behind them the
  // grid reads as uneven even though each <Image> itself is capped at the
  // same size. A consistent light backing (logos are designed for it) plus
  // resizeMode="contain" keeps every mark the same footprint without
  // stretching or cropping.
  const LOGO_BOX = 44;

  const Logo = ({ item }: { item: any }) => (
    <View style={{
      width: LOGO_BOX, height: LOGO_BOX, borderRadius: 10,
      backgroundColor: '#FFFFFF',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {item.logoUrl && !imgErrors[item.id] ? (
        <Image
          source={{ uri: item.logoUrl }}
          style={{ width: LOGO_BOX - 10, height: LOGO_BOX - 10 }}
          resizeMode="contain"
          onError={() => setImgErrors(e => ({ ...e, [item.id]: true }))}
        />
      ) : (
        <View style={{
          width: '100%', height: '100%',
          backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
            {item.name.charAt(0)}
          </Text>
        </View>
      )}
    </View>
  );

  // Split into pairs for 2-column grid
  const rows: any[][] = [];
  for (let i = 0; i < brands.length; i += 2) {
    rows.push(brands.slice(i, i + 2));
  }

  const GRID_CARD_HEIGHT = 172;

  // A real, visibly-distinct tile. Two things that *don't* work on this
  // near-black palette: colors.card (#1A1D26) is only ~6/255 lighter than
  // colors.background (#0F1117) — a flat 1px border in that same tonal
  // range barely registers — and a drop shadow can't visibly darken
  // something that's already near-black, so shadow/elevation added no
  // depth cue either. What actually reads as a tile: colors.muted
  // (#262932, already proven visible elsewhere in this screen as the
  // unselected category-chip fill) for real lightness contrast, plus a
  // semi-transparent white border, which stays visible regardless of the
  // exact fill tone instead of depending on two adjacent dark hex values.
  // NOTE: deliberately not <Link asChild><Pressable style={fn}>> — on this
  // RN/expo-router version, Link's asChild cloning silently drops a
  // function-typed style prop on its child (confirmed earlier debugging a
  // near-identical bug on the Account screen's "My Codes" row), so the
  // container never got a background/border no matter what values were set.
  // A plain Pressable + router.push sidesteps that entirely.
  const GridCard = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => router.push(`/(home)/brand/${item.id}`)}
      style={({ pressed }) => ({
        flex: 1,
        height: GRID_CARD_HEIGHT,
        borderRadius: 16,
        backgroundColor: colors.muted,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        padding: 14,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      {/* Logo — centered, fixed size */}
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <Logo item={item} />
      </View>

      {/* Name + offer up top, code count pinned to the card's bottom edge
          via flex — height stays identical across every card regardless
          of whether the offer text is short, long, or missing. */}
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ gap: 3 }}>
          <Text style={{ fontSize: 14, color: colors.foreground, fontWeight: '600' }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 11, color: colors.accent }} numberOfLines={1}>
            {item.currentOffer || ' '}
          </Text>
        </View>

        <Text style={{ fontSize: 11, color: colors.mutedForeground }} numberOfLines={1}>
          {item.codeCount} code{item.codeCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 12, gap: 12 }}>
        {/* Search + view toggle */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', height: 44,
            borderRadius: 12, paddingHorizontal: 12, gap: 8, borderWidth: 1,
            backgroundColor: colors.input, borderColor: colors.border,
          }}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={{ flex: 1, color: colors.foreground, fontSize: 15 }}
              placeholder="Search brands..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Feather name="x-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Grid / List toggle */}
          <View style={{
            flexDirection: 'row', height: 44, borderRadius: 12, borderWidth: 1,
            borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.input,
          }}>
            {(['grid', 'list'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setViewMode(mode)}
                style={{
                  width: 44, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: viewMode === mode ? colors.primary : 'transparent',
                }}
              >
                <Feather
                  name={mode === 'grid' ? 'grid' : 'list'}
                  size={16}
                  color={viewMode === mode ? '#fff' : colors.mutedForeground}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Category chips — wraps to multiple rows instead of a horizontal
            scroller, so all 10+ categories stay visible/discoverable at once
            rather than hidden off-screen. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((item) => {
            const sel = category === item;
            return (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                  backgroundColor: sel ? colors.primary : colors.muted,
                  borderColor: sel ? colors.primary : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, color: sel ? '#fff' : colors.mutedForeground }}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 120, gap: 10 }}>
        {isLoading && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!isLoading && isError && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Feather name="alert-triangle" size={40} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground, fontSize: 17 }}>Something went wrong</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: 'center' }}>
              Couldn't load brands right now. Try again in a moment.
            </Text>
          </View>
        )}

        {!isLoading && !isError && brands.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <MaterialCommunityIcons name="magnify-close" size={48} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground, fontSize: 17, }}>No brands found</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: 'center' }}>Try a different search or category.</Text>
          </View>
        )}

        {/* ── GRID VIEW ── */}
        {viewMode === 'grid' && rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((item: any) => (
              <GridCard key={item.id} item={item} />
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && brands.map((item: any) => (
          <Link key={item.id} href={`/(home)/brand/${item.id}`} asChild>
            <Pressable style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 14,
              borderRadius: 14, backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border,
              paddingHorizontal: 14, paddingVertical: 12,
              opacity: pressed ? 0.82 : 1,
            })}>
              {/* Logo — same 36×36 */}
              <Logo item={item} />

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, color: colors.foreground }} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.currentOffer ? (
                  <Text style={{ fontSize: 12, color: colors.accent, }} numberOfLines={1}>
                    {item.currentOffer}
                  </Text>
                ) : null}
              </View>

              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, }}>
                  {item.codeCount} code{item.codeCount !== 1 ? 's' : ''}
                </Text>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </View>
            </Pressable>
          </Link>
        ))}
      </ScrollView>

      {/* FAB */}
      <Link href="/(home)/submit" asChild>
        <Pressable style={{
          position: 'absolute', right: 20,
          bottom: insets.bottom + (Platform.OS === 'ios' ? 80 : 90),
          width: 54, height: 54, borderRadius: 27,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.primary,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
        }}>
          <Feather name="plus" size={24} color="#fff" />
        </Pressable>
      </Link>
    </View>
  );
}
