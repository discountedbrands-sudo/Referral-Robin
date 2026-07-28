import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, RefreshControl, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListBrands } from '@workspace/api-client-react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const CATEGORIES = ['All', 'Fintech', 'Investing', 'Crypto', 'Banking'];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { data: brands = [], isLoading, isFetching, refetch } = useListBrands({
    search: search.trim() || undefined,
    category: category === 'All' ? undefined : category,
  });

  const renderBrand = ({ item }: { item: any }) => (
    <Link href={`/(home)/brand/${item.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { opacity: 0.8 }]}>
        <View style={styles.cardHeader}>
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} style={[styles.logo, { backgroundColor: colors.muted }]} contentFit="cover" />
          ) : (
            <View style={[styles.logo, { backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                {item.name.charAt(0)}
              </Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{item.codeCount} codes</Text>
          </View>
        </View>
        <Text style={[styles.brandName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.brandCategory, { color: colors.mutedForeground }]}>{item.category}</Text>
        {item.currentOffer && (
          <View style={styles.offerContainer}>
            <MaterialCommunityIcons name="gift-outline" size={14} color={colors.accent} />
            <Text style={[styles.offerText, { color: colors.accent }]} numberOfLines={1}>{item.currentOffer}</Text>
          </View>
        )}
      </Pressable>
    </Link>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Feather name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
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
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = category === item;
            return (
              <Pressable
                style={[
                  styles.categoryChip,
                  { backgroundColor: isSelected ? colors.primary : colors.muted },
                  isSelected && { borderColor: colors.primary }
                ]}
                onPress={() => setCategory(item)}
              >
                <Text style={[
                  styles.categoryText,
                  { color: isSelected ? colors.primaryForeground : colors.mutedForeground }
                ]}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={brands}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBrand}
        numColumns={2}
        contentContainerStyle={[styles.grid, { paddingBottom: 100 }]}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="magnify-close" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No brands found</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Try a different search or category.</Text>
            </View>
          ) : null
        }
      />

      <Link href="/(home)/submit" asChild>
        <Pressable style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + (Platform.OS === 'ios' ? 80 : 100) }]}>
          <Feather name="plus" size={24} color={colors.primaryForeground} />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  categoryList: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  grid: {
    padding: 16,
    gap: 16,
  },
  row: {
    gap: 16,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  brandName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  brandCategory: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  offerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  offerText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
