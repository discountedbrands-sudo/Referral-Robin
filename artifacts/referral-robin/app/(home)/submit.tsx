import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  Alert, Switch, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useListBrands, useSubmitCode, useGetBrand, getGetBrandQueryKey, getGetUserCodesQueryKey, getGetUserStatsQueryKey } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { parseDateInput } from '@/utils/parseDateInput';
import { AuthGate } from '@/components/AuthGate';

export default function SubmitScreen() {
  return (
    <AuthGate whenSignedOut="/(auth)/sign-in">
      <SubmitScreenInner />
    </AuthGate>
  );
}

function SubmitScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Set only when the FAB was tapped from a specific brand's page (see
  // components/AddFab.tsx) — reuses the same brand query the brand detail
  // screen already ran (same hook + query key), so this is a cache hit in
  // the common case rather than a duplicate lookup.
  const { brandSlug } = useLocalSearchParams<{ brandSlug?: string }>();

  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<{ id: number; name: string } | null>(null);
  const [code, setCode] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryInput, setExpiryInput] = useState('');
  const [expiryError, setExpiryError] = useState('');

  const { data: brands = [] } = useListBrands({ search: search.trim() || undefined });
  const { data: prefillBrand, isError: isPrefillError } = useGetBrand(brandSlug ?? '', {
    query: { queryKey: getGetBrandQueryKey(brandSlug ?? ''), enabled: !!brandSlug },
  });
  const queryClient = useQueryClient();
  const submitCode = useSubmitCode();

  useEffect(() => {
    if (prefillBrand && !selectedBrand) {
      setSelectedBrand({ id: prefillBrand.id, name: prefillBrand.name });
    }
  }, [prefillBrand]);

  // Locked in from a brand page — skip the picker entirely, and don't let
  // the chip below be tapped to go back to it.
  const brandLocked = !!brandSlug && !isPrefillError;
  // Still resolving the pre-fill brand — don't flash the picker in the
  // meantime. If the lookup fails (e.g. a stale/bad slug), fall through to
  // the normal picker instead of getting stuck here.
  const showPrefillLoading = !!brandSlug && !isPrefillError && !selectedBrand;

  const resetForm = () => {
    setSelectedBrand(null);
    setCode('');
    setHasExpiry(false);
    setExpiryInput('');
    setExpiryError('');
  };

  const handleExpiryChange = (text: string) => {
    setExpiryInput(text);
    setExpiryError('');
  };

  const handleSubmit = () => {
    if (!selectedBrand || !code.trim()) return;

    let expiresAt: string | undefined;
    if (hasExpiry) {
      const parsed = parseDateInput(expiryInput);
      if (!parsed) {
        setExpiryError('Enter a valid future date (DD/MM/YYYY)');
        return;
      }
      expiresAt = parsed;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    submitCode.mutate(
      { data: { brandId: selectedBrand.id, code: code.trim(), expiresAt: expiresAt ?? null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUserCodesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          // Alert.alert() is a no-op on react-native-web; fall back to window.alert.
          if (Platform.OS === 'web') window.alert('Your code has been added to the queue!');
          else Alert.alert('Success', 'Your code has been added to the queue!');
          router.back();
        },
        onError: (err: any) => {
          const message = err?.data?.error || 'Failed to submit code.';
          if (Platform.OS === 'web') window.alert(message);
          else Alert.alert('Error', message);
        },
      },
    );
  };

  const canSubmit = !!selectedBrand && !!code.trim() && !submitCode.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
      }}>
        <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 18, color: colors.foreground }}>Submit Code</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Brand picker */}
      {showPrefillLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !selectedBrand ? (
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 14, color: colors.secondaryForeground, marginBottom: 8, marginLeft: 4 }}>
            Select a Brand
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12,
            paddingHorizontal: 16, gap: 12, borderWidth: 1,
            backgroundColor: colors.input, borderColor: colors.border, marginBottom: 16,
          }}>
            <Feather name="search" size={20} color={colors.mutedForeground} />
            <TextInput
              style={{ flex: 1, height: '100%', fontSize: 16, color: colors.foreground }}
              placeholder="Search brands..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={brands}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 16, paddingHorizontal: 8,
                  borderBottomWidth: 1, borderBottomColor: colors.border,
                  backgroundColor: pressed ? colors.muted : 'transparent',
                })}
                onPress={() => setSelectedBrand({ id: item.id, name: item.name })}
              >
                <Text style={{ fontSize: 16, color: colors.foreground }}>{item.name}</Text>
                <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{item.category}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16, gap: 24 }}>
          {/* Selected brand chip — locked (no tap-to-change) when it came
              pre-filled from a brand's own page via the FAB. */}
          <Pressable
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: 16, borderRadius: 12, borderWidth: 1,
              backgroundColor: colors.muted, borderColor: colors.border,
            }}
            onPress={brandLocked ? undefined : resetForm}
            disabled={brandLocked}
          >
            <View>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 2 }}>Brand</Text>
              <Text style={{ fontSize: 18, color: colors.foreground }}>{selectedBrand.name}</Text>
            </View>
            {!brandLocked && <Feather name="edit-2" size={16} color={colors.mutedForeground} />}
          </Pressable>

          {/* Code input */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: colors.secondaryForeground, marginLeft: 4 }}>
              Your Referral Code or Link
            </Text>
            <TextInput
              style={{
                height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16,
                fontSize: 16,
                backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground,
              }}
              placeholder="e.g. ROBIN25"
              placeholderTextColor={colors.mutedForeground}
              value={code}
              onChangeText={setCode}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Expiry toggle */}
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => {
                setHasExpiry(v => !v);
                setExpiryInput('');
                setExpiryError('');
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                padding: 16, borderRadius: 12, borderWidth: 1,
                backgroundColor: colors.card, borderColor: colors.border,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 15, color: colors.foreground }}>
                  This code expires
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                  Expired codes are automatically removed from the queue
                </Text>
              </View>
              <Switch
                value={hasExpiry}
                onValueChange={(v) => {
                  setHasExpiry(v);
                  setExpiryInput('');
                  setExpiryError('');
                }}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            </Pressable>

            {hasExpiry && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 14, color: colors.secondaryForeground, marginLeft: 4 }}>
                  Expiry date
                </Text>
                <TextInput
                  style={{
                    height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16,
                    fontSize: 16,
                    backgroundColor: colors.input,
                    borderColor: expiryError ? '#ef4444' : colors.border,
                    color: colors.foreground,
                  }}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={colors.mutedForeground}
                  value={expiryInput}
                  onChangeText={handleExpiryChange}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                  maxLength={10}
                />
                {expiryError ? (
                  <Text style={{ fontSize: 12, color: '#ef4444', marginLeft: 4 }}>
                    {expiryError}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginLeft: 4 }}>
                    Enter the date the offer ends (e.g. 31/12/2025)
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Submit */}
          <Pressable
            style={({ pressed }) => ({
              height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.primary, marginTop: 8,
              opacity: !canSubmit ? 0.5 : pressed ? 0.8 : 1,
            })}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={{ fontSize: 16, color: colors.primaryForeground }}>
              {submitCode.isPending ? 'Submitting…' : 'Submit to Queue'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
