import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useCreateBrand } from '@workspace/api-client-react';
import { AuthGate } from '@/components/AuthGate';
import { BRAND_CATEGORIES } from '@/constants/categories';
import { WEB_TAB_BAR_HEIGHT } from '@/components/WebTabBar';

export default function AddCompanyScreen() {
  return (
    <AuthGate whenSignedOut="/(auth)/sign-in">
      <AddCompanyScreenInner />
    </AuthGate>
  );
}

// Admin-only enforcement is server-side (requireAdmin in api-server) — this
// screen doesn't try to duplicate that check client-side. "Start simple, no
// review queue yet" (backlog idea #8): any signed-in non-admin who reaches
// this just gets a 403 back on submit, surfaced as a plain error message.
function AddCompanyScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();

  const [name, setName] = useState(params.name ?? '');
  const [domain, setDomain] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [offer, setOffer] = useState('');

  const createBrand = useCreateBrand();

  const canSubmit = !!name.trim() && !!domain.trim() && !!category && !!offer.trim() && !createBrand.isPending;

  const handleSubmit = () => {
    if (!canSubmit || !category) return;

    createBrand.mutate(
      { data: { name: name.trim(), domain: domain.trim(), category, currentOffer: offer.trim() } },
      {
        onSuccess: () => {
          const message = `${name.trim()} has been added and is live.`;
          if (Platform.OS === 'web') window.alert(message);
          else Alert.alert('Added', message);
          router.back();
        },
        onError: (err: any) => {
          const message =
            err?.status === 403
              ? "You don't have access to add companies."
              : err?.data?.error || 'Failed to add company.';
          if (Platform.OS === 'web') window.alert(message);
          else Alert.alert('Error', message);
        },
      },
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
        <Text style={{ fontSize: 18, color: colors.foreground, fontWeight: '700' }}>Add a Company</Text>
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
          <Text style={{ fontSize: 14, color: colors.secondaryForeground }}>Domain</Text>
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
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Used to fetch the logo — no https://, just the bare domain.</Text>
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
            {createBrand.isPending ? 'Adding…' : 'Add Company'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
