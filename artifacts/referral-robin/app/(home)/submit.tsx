import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useListBrands, useSubmitCode } from '@workspace/api-client-react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function SubmitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<{ id: number; name: string } | null>(null);
  const [code, setCode] = useState('');

  const { data: brands = [] } = useListBrands({ search: search.trim() || undefined });
  const submitCode = useSubmitCode();

  const handleSubmit = () => {
    if (!selectedBrand || !code.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    submitCode.mutate({ data: { brandId: selectedBrand.id, code: code.trim() } }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Your code has been added to the queue!");
        router.back();
      },
      onError: (err: any) => {
        Alert.alert("Error", err?.data?.error || "Failed to submit code.");
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Submit Code</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {!selectedBrand ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryForeground }]}>Select a Brand</Text>
              <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Feather name="search" size={20} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search brands..."
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
              </View>
            </View>
            
            <FlatList
              data={brands}
              keyExtractor={(item) => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.brandItem,
                    { borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.muted }
                  ]}
                  onPress={() => setSelectedBrand({ id: item.id, name: item.name })}
                >
                  <Text style={[styles.brandItemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.brandItemCat, { color: colors.mutedForeground }]}>{item.category}</Text>
                </Pressable>
              )}
            />
          </>
        ) : (
          <View style={styles.form}>
            <Pressable 
              style={[styles.selectedBrandBox, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => {
                setSelectedBrand(null);
                setCode('');
              }}
            >
              <View>
                <Text style={[styles.selectedLabel, { color: colors.mutedForeground }]}>Brand</Text>
                <Text style={[styles.selectedName, { color: colors.foreground }]}>{selectedBrand.name}</Text>
              </View>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </Pressable>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryForeground }]}>Your Referral Code or Link</Text>
              <TextInput
                style={[styles.codeInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. ROBIN25"
                placeholderTextColor={colors.mutedForeground}
                value={code}
                onChangeText={setCode}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: colors.primary },
                (!code.trim() || submitCode.isPending) && { opacity: 0.5 },
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleSubmit}
              disabled={!code.trim() || submitCode.isPending}
            >
              <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
                {submitCode.isPending ? "Submitting..." : "Submit to Queue"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 4,
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
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  brandItemName: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  brandItemCat: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  form: {
    gap: 24,
  },
  selectedBrandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  selectedName: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  codeInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
