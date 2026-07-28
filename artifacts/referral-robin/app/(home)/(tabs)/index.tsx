import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  Platform, ScrollView, ActivityIndicator, Image, FlatList,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListBrands } from '@workspace/api-client-react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = ['All', 'Fintech', 'Investing', 'Crypto', 'Banking'];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const { data: brands = [], isLoading } = useListBrands({
    search: search.trim() || undefined,
    category: category === 'All' ? undefined : category,
  });

  const Logo = ({ item }: { item: any }) => (
    item.logoUrl && !imgErrors[item.id] ? (
      <Image
        source={{ uri: item.logoUrl }}
        style={{ width: 36, height: 36 }}
        resizeMode="contain"
        onError={() => setImgErrors(e => ({ ...e, [item.id]: true }))}
      />
    ) : (
      <View style={{
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: '#fff', fontSize: 15, }}>
          {item.name.charAt(0)}
        </Text>
      </View>
    )
  );

  // Split into pairs for 2-column grid
  const rows: any[][] = [];
  for (let i = 0; i < brands.length; i += 2) {
    rows.push(brands.slice(i, i + 2));
  }

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

        {/* Category chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const sel = category === item;
            return (
              <Pressable
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
          }}
        />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 120, gap: 10 }}>
        {isLoading && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!isLoading && brands.length === 0 && (
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
              <Link key={item.id} href={`/(home)/brand/${item.id}`} asChild>
                <Pressable style={({ pressed }) => ({
                  flex: 1, borderRadius: 16, overflow: 'hidden',
                  backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                  opacity: pressed ? 0.82 : 1,
                  padding: 14, gap: 10,
                })}>
                  {/* Logo — fixed 36×36 uniform */}
                  <Logo item={item} />

                  <View style={{ gap: 3 }}>
                    <Text style={{ fontSize: 14, color: colors.foreground }} numberOfLines={1}>
                      {item.name}
                    </Text>

                    {item.currentOffer ? (
                      <Text style={{ fontSize: 11, color: colors.accent, lineHeight: 15 }} numberOfLines={2}>
                        {item.currentOffer}
                      </Text>
                    ) : null}

                    <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                      {item.codeCount} code{item.codeCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </Pressable>
              </Link>
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
