import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useCreateBrand, useUpdateBrand, getListBrandsQueryKey } from '@workspace/api-client-react';
import { AuthGate } from '@/components/AuthGate';
import { BRAND_CATEGORIES } from '@/constants/categories';
import { BRAND_COUNTRIES } from '@/constants/countries';
import { WEB_TAB_BAR_HEIGHT } from '@/components/WebTabBar';

export default function AddCompanyScreen() {
  return (
    <AuthGate whenSignedOut="/(auth)/sign-in">
      <AddCompanyScreenInner />
    </AuthGate>
  );
}

// Create mode is open to any signed-in user (idea #8, opened up beyond
// admin-only) — the server rule-validates domain/offer (see
// POST /brands/submit) and publishes immediately either way; this screen
// just reacts to submissionStatus in the response to phrase the success
// message (admin vs. auto-approved-pending-spot-check).
//
// Edit mode stays admin-only (requireAdmin server-side) — this screen
// doesn't duplicate that check client-side either; a non-admin who somehow
// reaches edit mode just gets a 403 surfaced as a plain error message.
//
// Doubles as the edit screen: the admin panel navigates here with a
// brandId (+ current field values as params, avoiding a second fetch —
// it already has the full row from the list query). No brandId = create.
function AddCompanyScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ name?: string; brandId?: string; category?: string; country?: string; currentOffer?: string; active?: string }>();

  const isEdit = !!params.brandId;
  const brandId = isEdit ? Number(params.brandId) : null;

  const [name, setName] = useState(params.name ?? '');
  const [domain, setDomain] = useState('');
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [country, setCountry] = useState<string>(params.country ?? 'UK');
  const [offer, setOffer] = useState(params.currentOffer ?? '');
  const [active, setActive] = useState(params.active !== 'false');

  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const isPending = createBrand.isPending || updateBrand.isPending;

  // Domain is required to create (no logo without one) but optional to
  // edit — leaving it blank keeps the existing logo untouched.
  const canSubmit = !!name.trim() && (isEdit || !!domain.trim()) && !!category && !!offer.trim() && !isPending;

  const handleSubmit = () => {
    if (!canSubmit || !category) return;

    const notify = (title: string, message: string) => {
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert(title, message);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/brands'] });
      queryClient.invalidateQueries({ queryKey: getListBrandsQueryKey() });
      router.back();
    };

    const onErr = (err: any, fallback: string) => {
      const message = err?.status === 403 ? "You don't have access to do this." : err?.data?.error || fallback;
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Error', message);
    };

    if (isEdit && brandId !== null) {
      updateBrand.mutate(
        {
          brandId,
          data: {
            name: name.trim(),
            ...(domain.trim() ? { domain: domain.trim() } : {}),
            category,
            country,
            currentOffer: offer.trim(),
            active,
          },
        },
        { onSuccess: () => notify('Saved', `${name.trim()} has been updated.`), onError: (err) => onErr(err, 'Failed to save changes.') },
      );
    } else {
      createBrand.mutate(
        { data: { name: name.trim(), domain: domain.trim(), category, country, currentOffer: offer.trim() } },
        {
          onSuccess: (data) => {
            // Everyone goes live immediately now (server-side rule
            // validation, not manual review) — the wording just tells an
            // auto-approved (non-admin) submitter that a spot-check may
            // still follow, without blocking them on it.
            const message =
              data.submissionStatus === 'approved'
                ? `${name.trim()} has been added and is live.`
                : `${name.trim()} is live! We'll double-check it shortly.`;
            notify(data.submissionStatus === 'approved' ? 'Added' : 'Live', message);
          },
          onError: (err) => onErr(err, 'Failed to add company.'),
        },
      );
    }
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
        <Text style={{ fontSize: 18, color: colors.foreground, fontWeight: '700' }}>{isEdit ? 'Edit Company' : 'Add a Company'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: colors.secondaryForeground }}>Brand name</Text>
          <TextInput
            style={{
              height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16,
              backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground,
            }}
            placeholder="e.g. Monzo"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: colors.secondaryForeground }}>Domain{isEdit ? ' (optional)' : ''}</Text>
          <TextInput
            style={{
              height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16,
              backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground,
            }}
            placeholder="e.g. monzo.com"
            placeholderTextColor={colors.mutedForeground}
            value={domain}
            onChangeText={setDomain}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
            {isEdit
              ? 'Used to fetch the logo — leave blank to keep the current one.'
              : 'Used to fetch the logo — no https://, just the bare domain.'}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: colors.secondaryForeground }}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BRAND_CATEGORIES.map((c) => {
              const sel = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                    backgroundColor: sel ? colors.primary : colors.muted,
                    borderColor: sel ? colors.primary : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, color: sel ? '#fff' : colors.mutedForeground }}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: colors.secondaryForeground }}>Country</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BRAND_COUNTRIES.map((c) => {
              const sel = country === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCountry(c)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                    backgroundColor: sel ? colors.primary : colors.muted,
                    borderColor: sel ? colors.primary : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, color: sel ? '#fff' : colors.mutedForeground }}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: colors.secondaryForeground }}>Offer description</Text>
          <TextInput
            style={{
              minHeight: 90, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16,
              backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground,
            }}
            placeholder="e.g. You get £10, they get £10"
            placeholderTextColor={colors.mutedForeground}
            value={offer}
            onChangeText={setOffer}
            multiline
            textAlignVertical="top"
          />
        </View>

        {isEdit && (
          <Pressable
            onPress={() => setActive((v) => !v)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: 16, borderRadius: 12, borderWidth: 1,
              backgroundColor: colors.card, borderColor: colors.border,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 15, color: colors.foreground }}>Live</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                Off hides it from Explore without deleting it.
              </Text>
            </View>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => ({
            height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.primary, marginTop: 8,
            opacity: !canSubmit ? 0.5 : pressed ? 0.8 : 1,
          })}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={{ fontSize: 16, color: colors.primaryForeground, fontWeight: '700' }}>
            {isPending ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save Changes' : 'Add Company'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
