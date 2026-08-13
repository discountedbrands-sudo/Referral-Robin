import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  useListCodesForBrand, useRemoveCode, getListCodesForBrandQueryKey,
  type AdminCode, type CodeStatus,
} from '@workspace/api-client-react';
import { AuthGate } from '@/components/AuthGate';
import { WEB_TAB_BAR_HEIGHT } from '@/components/WebTabBar';
import { formatDateInput } from '@/utils/parseDateInput';

export default function AdminBrandCodesScreen() {
  return (
    <AuthGate whenSignedOut="/(auth)/sign-in">
      <AdminBrandCodesScreenInner />
    </AuthGate>
  );
}

const STATUS_FILTERS: { key: CodeStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Retired' },
  { key: 'removed', label: 'Removed' },
];

// Same look as dashboard.tsx's owner-facing status badges — kept consistent
// so "paused"/"removed" read the same way to an admin as they do to the
// code's own owner, just without the retire/edit actions (this is a
// read-only audit view, not code management).
const statusMeta: Record<CodeStatus, { label: string; bg: string; fg: string }> = {
  active: { label: 'ACTIVE', bg: 'rgba(34, 197, 94, 0.15)', fg: '#4ade80' },
  paused: { label: 'RETIRED', bg: 'rgba(148, 163, 184, 0.15)', fg: '#94a3b8' },
  removed: { label: 'REMOVED', bg: 'rgba(239, 68, 68, 0.15)', fg: '#ef4444' },
};

// Every code ever submitted for a brand, for auditing coverage/duplicates/
// quality — distinct from the owner-facing "My Codes" dashboard (that's
// scoped to the signed-in user's own codes) and from the brand-submission
// spot-check on the admin brand list (that's about *brands*, not codes).
// This didn't exist anywhere before — confirmed by reading through the
// admin panel and every codes-related endpoint first.
function AdminBrandCodesScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { brandId, brandName } = useLocalSearchParams<{ brandId: string; brandName?: string }>();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CodeStatus | 'all'>('all');

  const { data: codes = [], isLoading, isError, error } = useListCodesForBrand(Number(brandId));
  const removeCode = useRemoveCode();
  const isForbidden = (error as any)?.status === 403;

  const filtered = codes.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return c.code.toLowerCase().includes(q) || (c.ownerEmail ?? '').toLowerCase().includes(q);
  });

  // Soft delete (status -> "removed", row kept) — same mechanism the
  // report-threshold auto-remove already uses, just admin-triggered. No
  // hard delete here on purpose: nothing about this action is unrecoverable.
  const doRemove = (item: AdminCode) => {
    removeCode.mutate(
      { codeId: item.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCodesForBrandQueryKey(Number(brandId)) });
        },
        onError: (err: any) => {
          const message = err?.data?.error || 'Failed to remove code.';
          if (Platform.OS === 'web') window.alert(message);
          else Alert.alert('Error', message);
        },
      },
    );
  };

  const handleRemove = (item: AdminCode) => {
    const message = `Remove this code? It'll stop being served immediately. This can't be undone from here.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) doRemove(item);
      return;
    }
    Alert.alert('Remove code', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => doRemove(item) },
    ]);
  };

  const CodeRow = ({ item }: { item: AdminCode }) => {
    const meta = statusMeta[item.status];
    return (
      <View style={{
        borderRadius: 14, backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.border,
        padding: 14, gap: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text
            style={{ flex: 1, fontSize: 15, color: colors.foreground, fontWeight: '600' }}
            numberOfLines={1}
            selectable
          >
            {item.code}
          </Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: meta.bg }}>
            <Text style={{ fontSize: 11, color: meta.fg, fontWeight: '600' }}>{meta.label}</Text>
          </View>
          {item.status !== 'removed' && (
            <Pressable
              onPress={() => handleRemove(item)}
              hitSlop={8}
              style={{ padding: 2 }}
              disabled={removeCode.isPending}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
          )}
        </View>

        <Text style={{ fontSize: 13, color: colors.secondaryForeground }} numberOfLines={1}>
          {item.ownerEmail ?? `Owner ${item.ownerId}`}
        </Text>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
            Submitted {formatDateInput(item.createdAt)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
            {item.timesServed} served · {item.timesCopied} copied
          </Text>
          {item.reportCount > 0 && (
            <Text style={{ fontSize: 12, color: colors.destructive }}>
              {item.reportCount} report{item.reportCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>
    );
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
        <Text style={{ fontSize: 18, color: colors.foreground, fontWeight: '700' }} numberOfLines={1}>
          {brandName ? `${brandName}: Codes` : 'Codes'}
        </Text>
        <View style={{ width: 44 }} />
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
            {isForbidden ? "You don't have access to this page." : 'Something went wrong loading codes.'}
          </Text>
        </View>
      )}

      {!isLoading && !isError && (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', height: 44,
              borderRadius: 12, paddingHorizontal: 12, gap: 8, borderWidth: 1,
              backgroundColor: colors.input, borderColor: colors.border,
            }}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={{ flex: 1, color: colors.foreground, fontSize: 15 }}
                placeholder={`Search ${codes.length} code${codes.length !== 1 ? 's' : ''} or owner...`}
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

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STATUS_FILTERS.map(({ key, label }) => {
                const sel = statusFilter === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setStatusFilter(key)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                      backgroundColor: sel ? colors.primary : colors.muted,
                      borderColor: sel ? colors.primary : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: sel ? '#fff' : colors.mutedForeground }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
            renderItem={({ item }) => <CodeRow item={item} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                  {codes.length === 0 ? 'No codes submitted for this brand yet.' : 'No codes match your filters.'}
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}
