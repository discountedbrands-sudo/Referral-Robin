import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListBrands } from '@workspace/api-client-react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = ['All', 'Fintech', 'Investing', 'Crypto', 'Banking'];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { data: brands = [], isLoading, refetch } = useListBrands({
    search: search.trim() || undefined,
    category: category === 'All' ? undefined : category,
  });

  // Split brands into pairs for 2-column grid
  const rows: any[][] = [];
  for (let i = 0; i < brands.length; i += 2) {
    rows.push(brands.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 16, gap: 16 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', height: 48,
          borderRadius: 12, paddingHorizontal: 16, gap: 12, borderWidth: 1,
          backgroundColor: colors.input, borderColor: colors.border,
        }}>
          <Feather name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={{ flex: 1, color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 16 }}
            placeholder="Search brands..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Feather name="x-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const isSelected = category === item;
            return (
              <Pressable
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: isSelected ? colors.primary : colors.muted,
                  borderColor: isSelected ? colors.primary : 'transparent',
                }}
                onPress={() => setCategory(item)}
              >
                <Text style={{
                  fontFamily: 'Inter_500Medium', fontSize: 14,
                  color: isSelected ? colors.primaryForeground : colors.mutedForeground,
                }}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Brand grid using ScrollView to avoid numColumns DOM issues */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}>
        {isLoading && (
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!isLoading && brands.length === 0 && (
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
            <MaterialCommunityIcons name="magnify-close" size={48} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground, fontSize: 18, fontFamily: 'Inter_600SemiBold' }}>No brands found</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
              Try a different search or category.
            </Text>
          </View>
        )}

        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 16 }}>
            {row.map((item: any) => (
              <Link key={item.id} href={`/(home)/brand/${item.id}`} asChild>
                <Pressable style={({ pressed }) => ({
                  flex: 1, borderRadius: 16, padding: 16, borderWidth: 1, gap: 8,
                  backgroundColor: colors.card, borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    {item.logoUrl ? (
                      <Image
                        source={{ uri: item.logoUrl }}
                        style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.muted }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                          {item.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.muted }}>
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground }}>
                        {item.codeCount} codes
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground }}>
                    {item.category}
                  </Text>
                  {item.currentOffer ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <MaterialCommunityIcons name="gift-outline" size={14} color={colors.accent} />
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.accent, flex: 1 }} numberOfLines={1}>
                        {item.currentOffer}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </Link>
            ))}
            {/* Fill empty slot in last row if odd number of brands */}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </ScrollView>

      <Link href="/(home)/submit" asChild>
        <Pressable style={{
          position: 'absolute', right: 24,
          bottom: insets.bottom + (Platform.OS === 'ios' ? 80 : 100),
          width: 56, height: 56, borderRadius: 28,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.primary,
          elevation: 4,
        }}>
          <Feather name="plus" size={24} color={colors.primaryForeground} />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({});
