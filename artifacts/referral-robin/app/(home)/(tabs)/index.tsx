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
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const { data: brands = [], isLoading } = useListBrands({
    search: search.trim() || undefined,
    category: category === 'All' ? undefined : category,
  });

  // Split into pairs for 2-column grid
  const rows: any[][] = [];
  for (let i = 0; i < brands.length; i += 2) {
    rows.push(brands.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 12, gap: 12 }}>
        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', height: 48,
          borderRadius: 14, paddingHorizontal: 14, gap: 10, borderWidth: 1,
          backgroundColor: colors.input, borderColor: colors.border,
        }}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={{ flex: 1, color: colors.foreground, fontSize: 15 }}
            placeholder="Search brands..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
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
                  paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: sel ? colors.primary : colors.muted,
                  borderColor: sel ? colors.primary : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: sel ? '#fff' : colors.mutedForeground }}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Grid */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 120, gap: 12 }}>
        {isLoading && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!isLoading && brands.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <MaterialCommunityIcons name="magnify-close" size={48} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: 'Inter_600SemiBold' }}>No brands found</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: 'center' }}>Try a different search or category.</Text>
          </View>
        )}

        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 12 }}>
            {row.map((item: any) => (
              <Link key={item.id} href={`/(home)/brand/${item.id}`} asChild>
                <Pressable style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                })}>
                  {/* Logo banner */}
                  <View style={{
                    height: 90,
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 14,
                  }}>
                    {item.logoUrl && !imgErrors[item.id] ? (
                      <Image
                        source={{ uri: item.logoUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                        onError={() => setImgErrors(e => ({ ...e, [item.id]: true }))}
                      />
                    ) : (
                      <View style={{
                        width: 52, height: 52, borderRadius: 14,
                        backgroundColor: colors.primary,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' }}>
                          {item.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={{ padding: 12, gap: 4 }}>
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }} numberOfLines={1}>
                      {item.name}
                    </Text>

                    {item.currentOffer ? (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                        <MaterialCommunityIcons name="gift-outline" size={13} color={colors.accent} style={{ marginTop: 1 }} />
                        <Text style={{ fontSize: 12, color: colors.accent, fontFamily: 'Inter_500Medium', flex: 1, lineHeight: 17 }} numberOfLines={2}>
                          {item.currentOffer}
                        </Text>
                      </View>
                    ) : null}

                    <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                      {item.codeCount} code{item.codeCount !== 1 ? 's' : ''} available
                    </Text>
                  </View>
                </Pressable>
              </Link>
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
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
