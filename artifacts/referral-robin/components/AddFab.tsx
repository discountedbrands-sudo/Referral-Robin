import React, { useState } from 'react';
import { Pressable, View, Text, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

// One row of the expanded FAB menu — a text label chip next to a circular
// icon button, right-aligned at a fixed height above the main FAB.
function FabOption({
  icon, label, onPress, bottom, colors,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  bottom: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        position: 'absolute', right: 20, bottom,
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}
    >
      <View style={{
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
      }}>
        <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '600' }}>{label}</Text>
      </View>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5,
      }}>
        <Feather name={icon} size={18} color={colors.foreground} />
      </View>
    </Pressable>
  );
}

// Global expandable "+" FAB — rendered once from the (home) layout so it
// persists across Explore, brand detail, My Codes, Account, etc. (moved out
// of the Explore screen, which is where this started life on Aug 10).
export function AddFab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Cast away expo-router's typed-routes tuple union — we only need loose
  // membership checks here (which literal segment names are present),
  // not the full statically-known segment shape.
  const segments = useSegments() as readonly string[];
  const { slug } = useGlobalSearchParams<{ slug?: string }>();
  const [fabOpen, setFabOpen] = useState(false);

  // Hide entirely on the Add Code / Add Brand screens themselves — no point
  // offering "add" shortcuts on top of the form they open.
  const isAddScreen = segments.includes('submit') || segments.includes('submit-brand');
  if (isAddScreen) return null;

  // Only the 3 tab screens (Explore/My Codes/Account) have a bottom tab bar
  // to clear on native — everything else (notably brand detail, whose
  // reveal/copy button is pinned near the bottom edge) needs the FAB lifted
  // well clear of that bottom-anchored content instead of sitting on it.
  const inTabs = segments.includes('(tabs)');
  const onBrandDetail = segments.includes('brand') && !!slug;
  // brand/[slug].tsx pins its bottom content via marginTop:'auto' +
  // marginBottom:40 inside a padding:24 container, so the gap from the
  // screen's bottom edge to the top of that block is a fixed pixel value
  // (independent of viewport height), computable from its own styles:
  //   pre-reveal (infoCard + mainButton): 24(padding) + 40(marginBottom)
  //     + infoCard(~54) + gap(24) + mainButton(56) = 198
  //   revealed (codeCard incl. Copy button + report link) — taller, so
  //     this is the binding case: 24 + 40 + codeCard(~199) + gap(24)
  //     + reportButton(~41) = 328
  // 350 clears the taller revealed state (confirmed live for the shorter
  // pre-reveal state, where it leaves a clean ~150px gap) with a small
  // margin, so the FAB never sits on top of either state's card/button.
  const baseBottom = inTabs
    ? insets.bottom + (Platform.OS === 'ios' ? 80 : 90)
    : insets.bottom + (onBrandDetail ? 350 : 20);

  const handleAddCode = () => {
    setFabOpen(false);
    // On a brand's own page, skip the Add Code form's brand picker entirely
    // by handing it the brand already in view.
    if (onBrandDetail && slug) {
      router.push({ pathname: '/(home)/submit', params: { brandSlug: slug } });
    } else {
      router.push('/(home)/submit');
    }
  };

  return (
    <>
      {fabOpen && (
        <Pressable
          accessibilityLabel="Close menu"
          onPress={() => setFabOpen(false)}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        />
      )}

      {fabOpen && (
        <FabOption
          icon="tag"
          label="Add Brand"
          colors={colors}
          onPress={() => {
            setFabOpen(false);
            router.push('/(home)/admin/submit-brand');
          }}
          bottom={baseBottom + 70}
        />
      )}

      {fabOpen && (
        <FabOption
          icon="hash"
          label="Add Code"
          colors={colors}
          onPress={handleAddCode}
          bottom={baseBottom + 14}
        />
      )}

      <Pressable
        accessibilityLabel={fabOpen ? 'Close menu' : 'Add brand or code'}
        onPress={() => setFabOpen((o) => !o)}
        style={{
          position: 'absolute', right: 20,
          bottom: baseBottom,
          width: 54, height: 54, borderRadius: 27,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.primary,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
        }}
      >
        <Feather name={fabOpen ? 'x' : 'plus'} size={24} color="#fff" />
      </Pressable>
    </>
  );
}
