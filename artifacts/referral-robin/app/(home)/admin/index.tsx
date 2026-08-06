import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useListBrandsAdmin, useDeleteBrand, useApproveBrand, useRejectBrand, getListBrandsQueryKey } from '@workspace/api-client-react';
import { AuthGate } from '@/components/AuthGate';
import { WEB_TAB_BAR_HEIGHT } from '@/components/WebTabBar';

export default function AdminBrandsScreen() {
  return (
    <AuthGate whenSignedOut="/(auth)/sign-in">
      <AdminBrandsScreenInner />
    </AuthGate>
  );
}

// Same "server is the real gate" approach as submit-brand.tsx — a
// non-admin who reaches this just sees the 403 surfaced below instead of a
// duplicated client-side check.
function AdminBrandsScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const { data: brands = [], isLoading, isError, error } = useListBrandsAdmin();
  const deleteBrand = useDeleteBrand();
  const approveBrand = useApproveBrand();
  const rejectBrand = useRejectBrand();

  const isForbidden = (error as any)?.status === 403;

  // Pending submissions float to the top — that's the queue an admin
  // actually needs to work through; everything else is already settled.
  const sortedBrands = [...brands].sort((a, b) => {
    const aPending = a.submissionStatus === 'pending' ? 0 : 1;
    const bPending = b.submissionStatus === 'pending' ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return a.name.localeCompare(b.name);
  });

  const filtered = search.trim()
    ? sortedBrands.filter((b) => b.name.toLowerCase().includes(search.trim().toLowerCase()))
    : sortedBrands;

  const pendingCount = brands.filter((b) => b.submissionStatus === 'pending').length;

  const invalidateBrandLists = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/brands'] });
    queryClient.invalidateQueries({ queryKey: getListBrandsQueryKey() });
  };

  const handleEdit = (brand: (typeof brands)[number]) => {
    router.push({
      pathname: '/(home)/admin/submit-brand',
      params: {
        brandId: String(brand.id),
        name: brand.name,
        category: brand.category,
        currentOffer: brand.currentOffer ?? '',
        active: String(brand.active),
      },
    });
  };

  const doDelete = (brand: (typeof brands)[number]) => {
    deleteBrand.mutate(
      { brandId: brand.id },
      {
        onSuccess: () => {
          invalidateBrandLists();
        },
        onError: (err: any) => {
          const message = err?.data?.error || 'Failed to delete brand.';
          if (Platform.OS === 'web') window.alert(message);
          else Alert.alert('Error', message);
        },
      },
    );
  };

  const handleDelete = (brand: (typeof brands)[number]) => {
    const message = `Delete ${brand.name}? This can't be undone.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) doDelete(brand);
      return;
    }
    Alert.alert('Delete brand', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doDelete(brand) },
    ]);
  };

  const onMutateErr = (err: any, fallback: string) => {
    const message = err?.data?.error || fallback;
    if (Platform.OS === 'web') window.alert(message);
    else Alert.alert('Error', message);
  };

  // No confirm — approving is low-stakes and reversible (reject/edit after).
  const handleApprove = (brand: (typeof brands)[number]) => {
    approveBrand.mutate(
      { brandId: brand.id },
      { onSuccess: invalidateBrandLists, onError: (err: any) => onMutateErr(err, 'Failed to approve brand.') },
    );
  };

  // Confirm — rejecting hides a real user's submission, worth a beat to undo a misclick.
  const doReject = (brand: (typeof brands)[number]) => {
    rejectBrand.mutate(
      { brandId: brand.id },
      { onSuccess: invalidateBrandLists, onError: (err: any) => onMutateErr(err, 'Failed to reject brand.') },
    );
  };

  const handleReject = (brand: (typeof brands)[number]) => {
    const message = `Reject ${brand.name}? It'll stay hidden but you can still approve it later.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) doReject(brand);
      return;
    }
    Alert.alert('Reject submission', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => doReject(brand) },
    ]);
  };

  const statusMeta = (brand: (typeof brands)[number]) => {
    if (brand.submissionStatus === 'pending') return { label: 'PENDING REVIEW', bg: 'rgba(245, 158, 11, 0.15)', fg: '#f59e0b' };
    if (brand.submissionStatus === 'rejected') return { label: 'REJECTED', bg: 'rgba(239, 68, 68, 0.15)', fg: '#ef4444' };
    if (brand.active) return { label: 'ACTIVE', bg: 'rgba(34, 197, 94, 0.15)', fg: '#4ade80' };
    return { label: 'HIDDEN', bg: colors.muted, fg: colors.mutedForeground };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: (Platform.OS === 'web' ? WEB_TAB_BAR_HEIGHT : insets.top) + 16,
          paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 18, color: colors.foreground, fontWeight: '700' }}>
          Admin: Brands{pendingCount > 0 ? ` (${pendingCount} pending)` : ''}
        </Text>
        <Pressable
          onPress={() => router.push('/(home)/admin/submit-brand')}
          style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
        >
          <Feather name="plus" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading && (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!isLoading && isError && (
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 }}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, fontSize: 17, textAlign: 'center' }}>
            {isForbidden ? "You don't have access to this page." : 'Something went wrong loading brands.'}
          </Text>
        </View>
      )}

      {!isLoading && !isError && (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', height: 44,
              borderRadius: 12, paddingHorizontal: 12, gap: 8, borderWidth: 1,
              backgroundColor: colors.input, borderColor: colors.border,
            }}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={{ flex: 1, color: colors.foreground, fontSize: 15 }}
                placeholder={`Search ${brands.length} brands...`}
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
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderRadius: 14, backgroundColor: colors.card,
                  borderWidth: 1, borderColor: colors.border,
                  paddingHorizontal: 14, paddingVertical: 10,
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 8, backgroundColor: '#FFFFFF',
                  alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={{ width: 30, height: 30 }} resizeMode="contain" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '700' }}>{item.name.charAt(0)}</Text>
                  )}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 15, color: colors.foreground, fontWeight: '600' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>
                    {item.category}
                  </Text>
                </View>

                <View style={{
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                  backgroundColor: statusMeta(item).bg,
                }}>
                  <Text style={{ fontSize: 11, color: statusMeta(item).fg, fontWeight: '600' }}>
                    {statusMeta(item).label}
                  </Text>
                </View>

                {item.submissionStatus === 'pending' && (
                  <>
                    <Pressable
                      onPress={() => handleApprove(item)}
                      hitSlop={8}
                      style={{ padding: 4 }}
                      disabled={approveBrand.isPending}
                    >
                      <Feather name="check-circle" size={18} color="#4ade80" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleReject(item)}
                      hitSlop={8}
                      style={{ padding: 4 }}
                      disabled={rejectBrand.isPending}
                    >
                      <Feather name="x-circle" size={18} color={colors.destructive} />
                    </Pressable>
                  </>
                )}

                <Pressable onPress={() => handleEdit(item)} hitSlop={8} style={{ padding: 4 }}>
                  <Feather name="edit-2" size={18} color={colors.mutedForeground} />
                </Pressable>
                <Pressable onPress={() => handleDelete(item)} hitSlop={8} style={{ padding: 4 }} disabled={deleteBrand.isPending}>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>No brands match "{search}".</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}
