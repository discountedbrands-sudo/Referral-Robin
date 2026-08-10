import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  Platform, ScrollView, ActivityIndicator, Image, useWindowDimensions,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListBrands } from '@workspace/api-client-react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WEB_TAB_BAR_HEIGHT } from '@/components/WebTabBar';
import { BRAND_CATEGORIES } from '@/constants/categories';
import { BRAND_COUNTRIES } from '@/constants/countries';

const CATEGORIES = ['All', ...BRAND_CATEGORIES];
const COUNTRIES = ['All', ...BRAND_COUNTRIES];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [country, setCountry] = useState('All');
  const [sort, setSort] = useState<'name' | 'popular'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const { width } = useWindowDimensions();
  // 2 columns on native (phone-width) and narrow web; scales up to 4 on a
  // wide desktop viewport instead of staying pinned at 2 — a comparison-site
  // grid should pack more tiles per screen as there's more room, not just
  // stretch the same 2 columns wider.
  const numColumns = Platform.OS === 'web' ? Math.max(2, Math.min(4, Math.floor(width / 260))) : 2;
  // Below this, wrapping category chips ate half the screen (multiple rows
  // of chips before any brand was visible) — switch to a horizontal
  // scroller instead. Wide/desktop keeps the wrapping row since there's
  // room for every category to stay visible at once.
  const isNarrow = width < 600;

  const { data, isLoading, isError } = useListBrands({
    search: search.trim() || undefined,
    category: category === 'All' ? undefined : category,
    country: country === 'All' ? undefined : country,
    sort,
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
  // Bumped from 44 — at 106 brands across 10 categories, the logo is the
  // fastest way to recognise a brand at a glance, so it gets more of the
  // tile's footprint; everything else below (padding, text, gaps) shrinks
  // to compensate, keeping the overall tile the same size.
  const LOGO_BOX = 60;

  const Logo = ({ item, size = LOGO_BOX }: { item: any; size?: number }) => (
    <View style={{
      width: size, height: size, borderRadius: size >= 56 ? 12 : 10,
      backgroundColor: '#FFFFFF',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {item.logoUrl && !imgErrors[item.id] ? (
        <Image
          source={{ uri: item.logoUrl }}
          style={{ width: size - 10, height: size - 10 }}
          resizeMode="contain"
          onError={() => setImgErrors(e => ({ ...e, [item.id]: true }))}
        />
      ) : (
        <View style={{
          width: '100%', height: '100%',
          backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: size >= 56 ? 22 : 17, fontWeight: '600' }}>
            {item.name.charAt(0)}
          </Text>
        </View>
      )}
    </View>
  );

  // Wraps to multiple rows on wide/desktop screens so every option stays
  // visible/discoverable at once, but that wrapping eats half the screen on
  // narrow widths, so scroll horizontally there instead. Shared by both the
  // category and country chip rows below.
  const ChipRow = ({ items, selected, onSelect }: { items: readonly string[]; selected: string; onSelect: (item: string) => void }) => {
    const chip = (item: string) => {
      const sel = selected === item;
      return (
        <Pressable
          key={item}
          onPress={() => onSelect(item)}
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
    };

    return isNarrow ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {items.map(chip)}
      </ScrollView>
    ) : (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map(chip)}
      </View>
    );
  };

  // Split into rows of `numColumns` for the grid
  const rows: any[][] = [];
  for (let i = 0; i < brands.length; i += numColumns) {
    rows.push(brands.slice(i, i + numColumns));
  }

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
  // No fixed height/flex-space-between here on purpose — every text line
  // below is numberOfLines={1} at a fixed font size, so every card's
  // content is already naturally the same height across the grid. Forcing
  // a taller fixed height and flex-filling the gap (the old approach) is
  // exactly what read as "too much empty space" — letting the card size to
  // its content with small fixed gaps is what makes it compact instead.
  const GridCard = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => router.push(`/(home)/brand/${item.slug}`)}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 16,
        backgroundColor: colors.muted,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        padding: 12,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      {/* Logo — centered, fixed size */}
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Logo item={item} />
      </View>

      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '600' }} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ fontSize: 10, color: colors.accent }} numberOfLines={1}>
          {item.currentOffer || ' '}
        </Text>
      </View>

      <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 8 }} numberOfLines={1}>
        {item.codeCount} code{item.codeCount !== 1 ? 's' : ''}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: (Platform.OS === 'web' ? WEB_TAB_BAR_HEIGHT : insets.top) + 16, paddingBottom: 12, gap: 12 }}>
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

          {/* Sort toggle — name (default) vs most-popular (all-time
              timesServed total, see api-server's /brands sort=popular). */}
          <View style={{
            flexDirection: 'row', height: 44, borderRadius: 12, borderWidth: 1,
            borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.input,
          }}>
            {(['name', 'popular'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setSort(mode)}
                accessibilityLabel={mode === 'name' ? 'Sort alphabetically' : 'Sort by popular'}
                style={{
                  width: 44, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: sort === mode ? colors.primary : 'transparent',
                }}
              >
                <Feather
                  name={mode === 'name' ? 'type' : 'trending-up'}
                  size={16}
                  color={sort === mode ? '#fff' : colors.mutedForeground}
                />
              </Pressable>
            ))}
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

        {/* Category chips */}
        <ChipRow items={CATEGORIES} selected={category} onSelect={setCategory} />

        {/* Country chips — defaults to "All" so nothing is hidden unless the
            user explicitly filters by country. */}
        <ChipRow items={COUNTRIES} selected={country} onSelect={setCountry} />
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

        {!isLoading && !isError && brands.length === 0 && search.trim() !== '' && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 }}>
            <MaterialCommunityIcons name="magnify-close" size={48} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground, fontSize: 17, textAlign: 'center' }}>
              Can't find "{search.trim()}"?
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: 'center' }}>
              Add it now and be the first in the queue.
            </Text>
            <Pressable
              onPress={() => router.push({ pathname: '/(home)/admin/submit-brand', params: { name: search.trim() } })}
              style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Add {search.trim()}</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !isError && brands.length === 0 && search.trim() === '' && (
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
            {/* Last row may have fewer than numColumns items — pad with
                invisible flex-1 spacers so real cards don't stretch wider
                than their siblings in the rows above. */}
            {Array.from({ length: numColumns - row.length }).map((_, i) => (
              <View key={`filler-${i}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && brands.map((item: any) => (
          <Link key={item.id} href={`/(home)/brand/${item.slug}`} asChild>
            <Pressable style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 14,
              borderRadius: 14, backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border,
              paddingHorizontal: 14, paddingVertical: 12,
              opacity: pressed ? 0.82 : 1,
            })}>
              {/* List rows stay at the original 44×44 — the bigger logo is a
                  grid-tile-specific readability fix, not needed in a
                  one-per-row list layout. */}
              <Logo item={item} size={44} />

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
